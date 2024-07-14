import { useSignal } from "@preact/signals"
import { useEffect } from "preact/hooks"
import { SynthSplash } from "../components/SynthSplash.tsx"
import { SynthScreen } from "../components/SynthScreen.tsx"
import { Program } from "../shared/types.ts"

const a = {
   ctx: undefined as AudioContext | undefined,
   osc: undefined as OscillatorNode | undefined,
   amp: undefined as GainNode | undefined,
}

const program = {
   versionstamp: `init`,
   is_playing: false,
   values: Array (24).fill (0),
}

const midi_to_freq = (midi: number) => {
   return 440 * Math.pow (2, (midi - 69) / 12)
}

const update_graph = () => {

   let is_populated = true
   Object.keys (a).forEach (key => {
      const node_key = key as keyof typeof a
      if (a[node_key] === undefined) {
         is_populated = false
     }
   })
   if (!is_populated) return

   if (a.ctx === undefined) return
   const t = a.ctx.currentTime

   if (a.amp === undefined) return
   if (!program.is_playing) {
      a.amp.gain.cancelScheduledValues (t)
      a.amp.gain.setValueAtTime (a.amp.gain.value, t)
      a.amp.gain.exponentialRampToValueAtTime (0.001, t + 0.02)
      a.amp.gain.linearRampToValueAtTime (0, t + 0.02 + 0.02)
      return
   }

   if (a.osc === undefined) return
   a.osc.frequency.cancelScheduledValues (t)
   a.osc.frequency.setValueAtTime (a.osc.frequency.value, t)
   a.osc.frequency.exponentialRampToValueAtTime (midi_to_freq (program.values[0]), t + 0.02)

   a.amp.gain.cancelScheduledValues (t)
   a.amp.gain.setValueAtTime (a.amp.gain.value, t)
   a.amp.gain.linearRampToValueAtTime (program.values[7] / 127, t + 0.02)

}

export default function Synth (props: {
   enabled: boolean,
   program: Program
}) {

   const enabled = useSignal (props.enabled)

   useEffect (() => {
      a.ctx = new AudioContext()
      a.ctx.suspend ()

      const es = new EventSource (`/api/listen`)
      es.onmessage = e => {
         const data = JSON.parse (e.data)
         if (program.versionstamp === `init` 
            || data.versionstamp > program.versionstamp) {
            Object.assign (program, data)
            console.log (program.values, program.is_playing)
            update_graph ()
         }
      }
   }, [])

   const enable = async () => {

      if (!a.ctx) return
      await a.ctx.resume ()

      const wake_lock = await navigator.wakeLock.request (`screen`)
      wake_lock.onrelease = () => location.reload ()

      a.osc = a.ctx.createOscillator ()
      a.osc.frequency.value = 40000
      a.osc.start ()

      a.amp = a.ctx.createGain ()
      a.amp.gain.value = 0
      a.osc.connect (a.amp).connect (a.ctx.destination)
      
      enabled.value = true
      console.log (`Audio Context is`, a.ctx.state)
 
      if (program.is_playing) update_graph ()
   }

   if (enabled.value) return <SynthScreen />
   else return <div onPointerDown={ enable } ><SynthSplash /></div>
}