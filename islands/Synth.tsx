import { useSignal } from "@preact/signals"
import { useEffect } from "preact/hooks"
import { SynthSplash } from "../components/SynthSplash.tsx"
import { SynthScreen } from "../components/SynthScreen.tsx"
import { Program } from "../shared/types.ts"
import { siq_gen } from "../shared/siq_gen.ts"

const rand_int = (m: number) => Math.floor (Math.random () * m) + 1

interface Operator {
   osc: OscillatorNode | undefined
   amp: GainNode | undefined
}

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
   vibrato: {
      osc: undefined as OscillatorNode | undefined,
      wid: undefined as GainNode | undefined,
   },
   timbre: [] as Operator [],
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

   const harm = freq * rand_element (num_array) / rand_element (den_array)
   a.osc.frequency.exponentialRampToValueAtTime (harm, t + lag_time)

   if (a.vibrato.wid === undefined) return
   const vib_wid = Math.pow (program.values[3] / 127, 4) * harm * 0.5
   a.vibrato.wid.gain.cancelScheduledValues (t)
   a.vibrato.wid.gain.setValueAtTime (a.vibrato.wid.gain.value, t)
   a.vibrato.wid.gain.linearRampToValueAtTime (vib_wid, t + lag_time)

   if (a.vibrato.osc === undefined) return
   const vib_freq = 0.05 * Math.pow (320, program.values[11] / 127)
   const vib_div = program.values[19] / 127
   const vib_mul = rand_int (vib_div * 6) / rand_int (vib_div * 6)

   a.vibrato.osc.frequency.cancelScheduledValues (t)
   a.vibrato.osc.frequency.setValueAtTime (a.vibrato.osc.frequency.value, t)
   a.vibrato.osc.frequency.exponentialRampToValueAtTime (vib_freq * vib_mul, t + lag_time)

   let t_harm = harm

   const t_dmp = program.values[5] / 127
   const t_amt = program.values[13] / 127
   const t_div = Math.random () * program.values[21] / 127

   for (let i = 0; i < 6; i++) {
      if (a.timbre[i].osc === undefined) return
      a.timbre[i].osc!.frequency.cancelScheduledValues (t)
      a.timbre[i].osc!.frequency.setValueAtTime (a.timbre[i].osc!.frequency.value, t)

      const t_num = Math.floor (program.values[4] * 11 / 127) + 1 // [1, 12]
      const t_den = Math.floor (program.values[12] * 11 / 127) + 1 // [1, 12]
      const t_unity = program.values[20] / 128 // [0, 1)
   
      const [ t_num_array, t_den_array ] = siq_gen (t_num, t_den, t_unity)
      t_harm = t_harm * rand_element (t_num_array) / rand_element (t_den_array)
      while (t_harm > 16000) t_harm /= 2
      a.timbre[i].osc!.frequency.exponentialRampToValueAtTime (t_harm, t + lag_time)

      if (a.timbre[i].amp === undefined) return
      a.timbre[i].amp!.gain.cancelScheduledValues (t)
      a.timbre[i].amp!.gain.setValueAtTime (a.timbre[i].amp!.gain.value, t)
      const t_vol = t_harm * t_amt * (1 - t_div) / ((i * t_dmp) + 1)
      a.timbre[i].amp!.gain.linearRampToValueAtTime (t_vol, t + lag_time)
   }

   if (a.tremolo.off === undefined ) return
   if (a.tremolo.wid === undefined) return
   const trem_val = program.values[2] / 254
   a.tremolo.off.offset.cancelScheduledValues (t)
   a.tremolo.wid.gain.cancelScheduledValues (t)
   a.tremolo.off.offset.setValueAtTime (a.tremolo.off.offset.value, t)
   a.tremolo.wid.gain.setValueAtTime (a.tremolo.wid.gain.value, t)
   a.tremolo.off.offset.linearRampToValueAtTime (1 - trem_val, t + lag_time)
   a.tremolo.wid.gain.linearRampToValueAtTime (trem_val, t + lag_time)


   const trem_div = program.values[18] / 127
   const trem_mul = rand_int (trem_div * 6) / rand_int (trem_div * 6)

   if (a.tremolo.osc === undefined) return
   const trem_freq = 0.05 * Math.pow (320, program.values[10] / 127)
   a.tremolo.osc.frequency.cancelScheduledValues (t)
   a.tremolo.osc.frequency.setValueAtTime (a.tremolo.osc.frequency.value, t)
   a.tremolo.osc.frequency.exponentialRampToValueAtTime (trem_freq * trem_mul, t + lag_time)

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

      a.timbre = Array (6).fill (0).map (() => {
         if (!a.ctx) return { osc: undefined, amp: undefined }

         const osc = a.ctx.createOscillator ()
         osc.frequency.value = 8000 * Math.pow (2, random_bi ()) 
         osc.start ()

         const amp = a.ctx.createGain ()
         amp.gain.value = 0

         return { osc, amp }
      })

      a.timbre.forEach ((o, i) => {
         if (!o.osc || !o.amp) return
         o.osc.connect (o.amp)
         if (i !== 0) {
            if (!a.timbre[i - 1].osc) return
            o.amp.connect (a.timbre[i - 1].osc!.frequency)
            // o.amp.connect (a.ctx!.destination)
         }
      })

      a.osc = a.ctx.createOscillator ()
      a.osc.frequency.value = 40000
      a.osc.start ()

      a.vibrato.osc = a.ctx.createOscillator ()
      a.vibrato.osc.frequency.value = 1
      a.vibrato.osc.start ()

      a.vibrato.wid = a.ctx.createGain ()
      a.vibrato.wid.gain.value = 0

      a.vibrato.osc.connect (a.vibrato.wid)
         .connect (a.osc.frequency)

      if (!a.timbre[0].amp) return
      a.timbre[0].amp.connect (a.osc.frequency)

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