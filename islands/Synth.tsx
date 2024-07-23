import { useSignal } from "@preact/signals"
import { useEffect } from "preact/hooks"
import { SynthSplash } from "../components/SynthSplash.tsx"
import { SynthScreen } from "../components/SynthScreen.tsx"
import { Program } from "../shared/types.ts"
import { siq_gen } from "../shared/siq_gen.ts"
import { CHAR_0 } from "$std/path/_common/constants.ts";

const a = {
   ctx: undefined as AudioContext | undefined,
   osc: undefined as OscillatorNode | undefined,
   amp: undefined as GainNode | undefined,
   rev: undefined as ConvolverNode | undefined,
   wet: undefined as GainNode | undefined,
   tremolo: {
      osc: undefined as OscillatorNode | undefined,
      off: undefined as ConstantSourceNode | undefined,
      wid: undefined as GainNode | undefined,
      amp: undefined as GainNode | undefined,
   },
}

const program = {
   versionstamp: `init`,
   is_playing: false,
   values: Array (24).fill (0),
}

const midi_to_freq = (midi: number) => {
   return 440 * Math.pow (2, (midi - 69) / 12)
}

const random_bi = () => {
   return Math.random () * 2 - 1
}

const rand_element = (array: number []) => {
   return array[Math.floor (Math.random () * array.length)]
}

const update_graph = () => {
   const lag_diversity = program.values[23] / 127
   const lag = Math.pow (program.values[15] / 127, 3) * 40
   const lag_time = lag * Math.pow (2, lag_diversity * random_bi ())

   if (a.ctx === undefined) return
   const t = a.ctx.currentTime

   if (a.amp === undefined) return
   if (!program.is_playing) {
      a.amp.gain.cancelScheduledValues (t)
      a.amp.gain.setValueAtTime (a.amp.gain.value, t)
      a.amp.gain.exponentialRampToValueAtTime (0.001, t + lag_time)
      a.amp.gain.linearRampToValueAtTime (0, t + lag_time + 0.02)
      return
   }

   if (a.osc === undefined) return
   a.osc.frequency.cancelScheduledValues (t)
   a.osc.frequency.setValueAtTime (a.osc.frequency.value, t)

   const fine_tune = program.values[8] * 0.0157480315 - 1
   const detune = random_bi () * program.values[16] / 128
   const freq = midi_to_freq (program.values[0] + fine_tune + detune)

   const num = Math.floor (program.values[1] * 11 / 127) + 1 // [1, 12]
   const den = Math.floor (program.values[9] * 11 / 127) + 1 // [1, 12]
   const unity = program.values[17] / 128 // [0, 1)

   const [ num_array, den_array ] = siq_gen (num, den, unity)

   console.log (num_array, den_array)

   const rel = rand_element (num_array) / rand_element (den_array)

   a.osc.frequency.exponentialRampToValueAtTime (freq * rel, t + lag_time)

   if (a.tremolo.off === undefined ) return
   if (a.tremolo.wid === undefined) return
   const trem_val = program.values[2] / 254
   console.log (trem_val)
   a.tremolo.off.offset.cancelScheduledValues (t)
   a.tremolo.wid.gain.cancelScheduledValues (t)
   a.tremolo.off.offset.setValueAtTime (a.tremolo.off.offset.value, t)
   a.tremolo.wid.gain.setValueAtTime (a.tremolo.wid.gain.value, t)
   a.tremolo.off.offset.linearRampToValueAtTime (1 - trem_val, t + lag_time)
   a.tremolo.wid.gain.linearRampToValueAtTime (trem_val, t + lag_time)

   const vol = program.values[7] / 127
   a.amp.gain.cancelScheduledValues (t)
   a.amp.gain.setValueAtTime (a.amp.gain.value, t)
   a.amp.gain.linearRampToValueAtTime (vol, t + lag_time)

   if (a.rev === undefined || a.wet === undefined) return

   const rev_diversity = 1 - (Math.random () * program.values[22] / 127)

   const rev_vol = program.values[14] * rev_diversity / 127
   a.wet.gain.cancelScheduledValues (t)
   a.wet.gain.setValueAtTime (a.wet.gain.value, t)
   a.wet.gain.linearRampToValueAtTime (rev_vol, t + lag_time)

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

      a.tremolo.osc = a.ctx.createOscillator ()
      a.tremolo.osc.frequency.value = 1
      a.tremolo.osc.start ()

      a.tremolo.wid = a.ctx.createGain ()
      a.tremolo.wid.gain.value = 0

      a.tremolo.amp = a.ctx.createGain ()
      a.tremolo.amp.gain.value = 0
      a.tremolo.osc
         .connect (a.tremolo.wid)
         .connect (a.tremolo.amp.gain)

      a.tremolo.off = a.ctx.createConstantSource ()
      a.tremolo.off.offset.value = 1
      a.tremolo.off.connect (a.tremolo.amp.gain)
      a.tremolo.off.start ()   
   
      a.amp = a.ctx.createGain ()
      a.amp.gain.value = 0
      a.osc.connect (a.tremolo.amp)
         .connect (a.amp)
         .connect (a.ctx.destination)

      a.rev = a.ctx.createConvolver ()
      const response = await fetch (`R1NuclearReactorHall.m4a`)
      const array_buffer = await response.arrayBuffer ()
      const audio_buffer = await a.ctx.decodeAudioData (array_buffer)
      a.rev.buffer = audio_buffer

      a.wet = a.ctx.createGain ()
      a.wet.gain.value = 0
      a.amp.connect (a.wet)
         .connect (a.rev)
         .connect (a.ctx.destination)
         
      enabled.value = true
      console.log (`Audio Context is`, a.ctx.state)
 
      if (program.is_playing) update_graph ()
   }

   if (enabled.value) return <SynthScreen />
   else return <div onPointerDown={ enable } ><SynthSplash /></div>
}