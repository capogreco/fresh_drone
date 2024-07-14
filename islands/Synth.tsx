import { useSignal } from "@preact/signals"
import { useEffect } from "preact/hooks"
import { SynthSplash } from "../components/SynthSplash.tsx"
import { SynthScreen } from "../components/SynthScreen.tsx"
import { Program } from "../shared/types.ts"

let ctx: AudioContext

const a = {
   ctx: undefined as AudioContext | undefined,
   osc: undefined as OscillatorNode | undefined,
   amp: undefined as GainNode | undefined,
}

const program = {
   versionstamp: `init`,
   is_playing: false,
   frequency: 440,
   lag_time: 0.02,
   amplitude: 0,
}

const update_graph = () => {
   if (!a.ctx || !a.osc || !a.amp) return

   const t = a.ctx.currentTime

   if (!program.is_playing) {
      a.amp.gain.cancelScheduledValues (t)
      a.amp.gain.setValueAtTime (a.amp.gain.value, t)
      a.amp.gain.exponentialRampToValueAtTime (0.001, t + program.lag_time)
      a.amp.gain.linearRampToValueAtTime (0, t + program.lag_time + 0.02)
      return
   }

   a.osc.frequency.cancelScheduledValues (t)
   a.osc.frequency.setValueAtTime (a.osc.frequency.value, t)
   a.osc.frequency.exponentialRampToValueAtTime (program.frequency, t + program.lag_time)

   a.amp.gain.cancelScheduledValues (t)
   a.amp.gain.setValueAtTime (a.amp.gain.value, t)
   a.amp.gain.linearRampToValueAtTime (program.amplitude, t + program.lag_time)

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
            console.log (program)
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