import { useSignal, Signal } from "@preact/signals"
import { useEffect, useMemo } from "preact/hooks"
import { SynthScreen } from "../components/SynthScreen.tsx"
import { Program } from "../shared/types.ts"
import { siq_gen } from "../shared/siq_gen.ts"
import { Component } from "preact"

const rand_int = (m: number) => Math.floor (Math.random () * m) + 1

interface Operator {
   osc: OscillatorNode | undefined
   amp: GainNode | undefined
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

interface SynthProps {
   enabled: boolean;
   program: Program;
   msg_sig: Signal<any>
   msg: {
     is_playing: boolean;
     type: string;
     values: number[];
     versionstamp: string;
     key: string;
   };
   voices: {
     total: number;
     index: number;
   };
   ctx: AudioContext | undefined;
 }


export default class Synth extends Component<SynthProps> {
   voices: { total: number, index: number }
   bank: any[] // Array<Program>
   program: Program
   a: {
      ctx: AudioContext | undefined,
      osc: OscillatorNode | undefined,
      amp: GainNode | undefined,
      rev: ConvolverNode | undefined,
      wet: GainNode | undefined,
      pan: StereoPannerNode | undefined,
      tremolo: {
         osc: OscillatorNode | undefined,
         off: ConstantSourceNode | undefined,
         wid: GainNode | undefined,
         amp: GainNode | undefined,
      },
      vibrato: {
         osc: OscillatorNode | undefined,
         wid: GainNode | undefined,
      },
      timbre: Operator[],
   }
   msg: {
      is_playing: boolean;
      type: string;
      values: number[];
      versionstamp: string;
      key: string;
   }

   constructor (props: SynthProps) {
      super ()
      this.props = props
   }

   componentDidMount = () => {
      this.get_wake_lock ()
      this.bank = Array (10).fill (false)
      this.a = {
         ctx: this.props.ctx as AudioContext | undefined,
         osc: undefined as OscillatorNode | undefined,
         amp: undefined as GainNode | undefined,
         rev: undefined as ConvolverNode | undefined,
         wet: undefined as GainNode | undefined,
         pan: undefined as StereoPannerNode | undefined,
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
         timbre: [] as Operator[],
      }
      this.init_audio ()
   }

   load_graph = (key: string, lag_time: number) => {
      const graph_values = this.bank[Number (key)]
      if (!graph_values) return

      const a = this.a
      if (!a.ctx) return

      const { voices } = this.props
   
      const t = a.ctx.currentTime
   
      a.amp!.gain.cancelScheduledValues (t)
      a.amp!.gain.setValueAtTime (a.amp!.gain.value, t)
      a.amp!.gain.linearRampToValueAtTime (graph_values.amp, t + lag_time)
   
      a.osc!.frequency.cancelScheduledValues (t)
      a.osc!.frequency.setValueAtTime (a.osc!.frequency.value, t)
      a.osc!.frequency.exponentialRampToValueAtTime (graph_values.freq, t + lag_time)
   
      a.wet!.gain.cancelScheduledValues (t)
      a.wet!.gain.setValueAtTime (a.wet!.gain.value, t)
      a.wet!.gain.linearRampToValueAtTime (graph_values.rev, t + lag_time)
   
      a.tremolo.osc!.frequency.cancelScheduledValues (t)
      a.tremolo.osc!.frequency.setValueAtTime (a.tremolo.osc!.frequency.value, t)
      a.tremolo.osc!.frequency.exponentialRampToValueAtTime (graph_values.trem_freq, t + lag_time)
   
   
      a.tremolo.wid!.gain.cancelScheduledValues (t)
      a.tremolo.wid!.gain.setValueAtTime (a.tremolo.wid!.gain.value, t)
      a.tremolo.wid!.gain.linearRampToValueAtTime (graph_values.trem_wid, t + lag_time)
   
      a.tremolo.off!.offset.cancelScheduledValues (t)
      a.tremolo.off!.offset.setValueAtTime (a.tremolo.off!.offset.value, t)
      a.tremolo.off!.offset.linearRampToValueAtTime (graph_values.trem_off, t + lag_time)
   
      a.vibrato.osc!.frequency.cancelScheduledValues (t)
      a.vibrato.osc!.frequency.setValueAtTime (a.vibrato.osc!.frequency.value, t)
      a.vibrato.osc!.frequency.exponentialRampToValueAtTime (graph_values.vib_freq, t + lag_time)
   
      a.vibrato.wid!.gain.cancelScheduledValues (t)
      a.vibrato.wid!.gain.setValueAtTime (a.vibrato.wid!.gain.value, t)
      a.vibrato.wid!.gain.linearRampToValueAtTime (graph_values.vib_wid, t + lag_time)
   
      graph_values.timbre.forEach ((o: { freq: number, amp: number }, i: number) => {
         if (!a.timbre[i].osc || !a.timbre[i].amp) return
         a.timbre[i].osc!.frequency.cancelScheduledValues (t)
         a.timbre[i].osc!.frequency.setValueAtTime (a.timbre[i].osc!.frequency.value, t)
         a.timbre[i].osc!.frequency.exponentialRampToValueAtTime (o.freq, t + lag_time)
   
         a.timbre[i].amp!.gain.cancelScheduledValues (t)
         a.timbre[i].amp!.gain.setValueAtTime (a.timbre[i].amp!.gain.value, t)
         a.timbre[i].amp!.gain.linearRampToValueAtTime (o.amp, t + lag_time)
      })   
   }

   save_graph = (key: string) => {
      const timbre = this.a.timbre.map (o => {
         if (!o.osc || !o.amp) return { freq: 0, amp: 0 }
         return { freq: o.osc.frequency.value, amp: o.amp.gain.value }
      })
      const graph_values = {
         freq: this.a.osc!.frequency.value,
         amp: this.a.amp!.gain.value,
         rev: this.a.wet!.gain.value,
         trem_freq: this.a.tremolo.osc!.frequency.value,
         trem_wid:  this.a.tremolo.wid!.gain.value,
         trem_off:  this.a.tremolo.off!.offset.value,
         vib_freq:  this.a.vibrato.osc!.frequency.value,
         vib_wid:   this.a.vibrato.wid!.gain.value,
         timbre,
      }
      this.bank[Number (key)] = graph_values
   }


   update_graph = async () => {
      const { voices, program } = this.props

      const g = this.a

      const lag_diversity = program.values[23] / 127
      const lag = Math.pow (program.values[15] / 127, 3) * 40
      const lag_time = lag * Math.pow (2, lag_diversity * random_bi ())
   
      if (g.ctx === undefined) return
      const t = g.ctx.currentTime
   
      if (g.amp === undefined) return
      if (!program.is_playing) {
         g.amp.gain.cancelScheduledValues (t)
         g.amp.gain.setValueAtTime (g.amp.gain.value, t)
         g.amp.gain.exponentialRampToValueAtTime (0.001, t + lag_time)
         g.amp.gain.linearRampToValueAtTime (0, t + lag_time + 0.02)
         return
      }
   
      if (g.osc === undefined) return
      g.osc.frequency.cancelScheduledValues (t)
      g.osc.frequency.setValueAtTime (g.osc.frequency.value, t)

      const fine_tune = program.values[8] * 0.0157480315 - 1
      const detune = random_bi () * program.values[16] / 128
      const freq = midi_to_freq (program.values[0] + fine_tune + detune)
   
      const num = Math.floor (program.values[1] * 11 / 127) + 1 // [1, 12]
      const den = Math.floor (program.values[9] * 11 / 127) + 1 // [1, 12]
      const unity = program.values[17] / 128 // [0, 1)
   
      const [ num_array, den_array ] = siq_gen (num, den, unity)
   
      const harm = freq * rand_element (num_array) / rand_element (den_array)
      g.osc.frequency.exponentialRampToValueAtTime (harm, t + lag_time)
   
      if (g.pan === undefined) return
   
      if (g.vibrato.wid === undefined) return
      const vib_wid = Math.pow (program.values[3] / 127, 4) * harm * 0.5
      g.vibrato.wid.gain.cancelScheduledValues (t)
      g.vibrato.wid.gain.setValueAtTime (g.vibrato.wid.gain.value, t)
      g.vibrato.wid.gain.linearRampToValueAtTime (vib_wid, t + lag_time)
   
      if (g.vibrato.osc === undefined) return
      const vib_freq = 0.05 * Math.pow (320, program.values[11] / 127)
      const vib_div = program.values[19] / 127
      const vib_mul = rand_int (vib_div * 6) / rand_int (vib_div * 6)
   
      g.vibrato.osc.frequency.cancelScheduledValues (t)
      g.vibrato.osc.frequency.setValueAtTime (g.vibrato.osc.frequency.value, t)
      g.vibrato.osc.frequency.exponentialRampToValueAtTime (vib_freq * vib_mul, t + lag_time)
   
      let t_harm = harm
   
      const t_dmp = program.values[5] / 127
      const t_amt = program.values[13] / 127
      const t_div = Math.random () * program.values[21] / 127
   
      for (let i = 0; i < 6; i++) {
         if (g.timbre[i].osc === undefined) return
         g.timbre[i].osc!.frequency.cancelScheduledValues (t)
         g.timbre[i].osc!.frequency.setValueAtTime (g.timbre[i].osc!.frequency.value, t)
   
         const t_num = Math.floor (program.values[4] * 11 / 127) + 1 // [1, 12]
         const t_den = Math.floor (program.values[12] * 11 / 127) + 1 // [1, 12]
         const t_unity = program.values[20] / 128 // [0, 1)
      
         const [ t_num_array, t_den_array ] = siq_gen (t_num, t_den, t_unity)
         t_harm = t_harm * rand_element (t_num_array) / rand_element (t_den_array)
         while (t_harm > 16000) t_harm /= 2
         g.timbre[i].osc!.frequency.exponentialRampToValueAtTime (t_harm, t + lag_time)
   
         if (g.timbre[i].amp === undefined) return
         g.timbre[i].amp!.gain.cancelScheduledValues (t)
         g.timbre[i].amp!.gain.setValueAtTime (g.timbre[i].amp!.gain.value, t)
         const t_vol = t_harm * t_amt * (1 - t_div) / ((i * t_dmp) + 1)
         g.timbre[i].amp!.gain.linearRampToValueAtTime (t_vol, t + lag_time)
      }
   
      if (g.tremolo.off === undefined ) return
      if (g.tremolo.wid === undefined) return
      const trem_val = program.values[2] / 254
      g.tremolo.off.offset.cancelScheduledValues (t)
      g.tremolo.wid.gain.cancelScheduledValues (t)
      g.tremolo.off.offset.setValueAtTime (g.tremolo.off.offset.value, t)
      g.tremolo.wid.gain.setValueAtTime   (g.tremolo.wid.gain.value, t)
      g.tremolo.off.offset.linearRampToValueAtTime (1 - trem_val, t + lag_time)
      g.tremolo.wid.gain.linearRampToValueAtTime (trem_val, t + lag_time)
   
      const trem_div = program.values[18] / 127
      const trem_mul = rand_int (trem_div * 6) / rand_int (trem_div * 6)
   
      if (g.tremolo.osc === undefined) return
      const trem_freq = 0.05 * Math.pow (320, program.values[10] / 127)

      if (g.tremolo.osc === undefined) return
      g.tremolo.osc.frequency.cancelScheduledValues (t)
      g.tremolo.osc.frequency.setValueAtTime (g.tremolo.osc.frequency.value, t)
      g.tremolo.osc.frequency.exponentialRampToValueAtTime (trem_freq * trem_mul, t + lag_time)
   
      const vol = program.values[7] / (127 * voices.total)
      g.amp.gain.cancelScheduledValues (t)
      g.amp.gain.setValueAtTime (g.amp.gain.value, t)
      g.amp.gain.linearRampToValueAtTime (vol, t + lag_time)
   
      if (g.rev === undefined || g.wet === undefined) return
   
      const rev_diversity = 1 - (Math.random () * program.values[22] / 127)
   
      const rev_vol = program.values[14] * rev_diversity / 127
      g.wet.gain.cancelScheduledValues (t)
      g.wet.gain.setValueAtTime (g.wet.gain.value, t)
      g.wet.gain.linearRampToValueAtTime (rev_vol, t + lag_time)

   }   

   init_audio = async () => {
      const { voices, program } = this.props

      if (!this.a.ctx) return
      this.a.timbre = Array (6).fill (0).map (() => {
         if (!this.a.ctx) return { osc: undefined, amp: undefined }

         const osc = this.a.ctx.createOscillator ()
         osc.frequency.value = 8000 * Math.pow (2, random_bi ()) 
         osc.start ()

         const amp = this.a.ctx.createGain ()
         amp.gain.value = 0

         return { osc, amp }
      }) 

      this.a.timbre.forEach ((o, i) => {
         if (!o.osc || !o.amp) return
         o.osc.connect (o.amp)
         if (i !== 0) {
            if (!this.a.timbre[i - 1].osc) return
            o.amp.connect (this.a.timbre[i - 1].osc!.frequency)
         }
      })

      this.a.osc = this.a.ctx.createOscillator ()
      this.a.osc.frequency.value = 8000 * Math.pow (2, random_bi ()) 
      this.a.osc.start ()

      this.a.vibrato.osc = this.a.ctx.createOscillator ()
      this.a.vibrato.osc.frequency.value = 1
      this.a.vibrato.osc.start ()

      this.a.vibrato.wid = this.a.ctx.createGain ()
      this.a.vibrato.wid.gain.value = 0

      this.a.vibrato.osc.connect (this.a.vibrato.wid)
         .connect (this.a.osc.frequency)

      if (!this.a.timbre[0].amp) return
      this.a.timbre[0].amp.connect (this.a.osc.frequency)

      this.a.tremolo.osc = this.a.ctx.createOscillator ()
      this.a.tremolo.osc.frequency.value = 1
      this.a.tremolo.osc.start ()

      this.a.tremolo.wid = this.a.ctx.createGain ()
      this.a.tremolo.wid.gain.value = 0

      this.a.tremolo.amp = this.a.ctx.createGain ()
      this.a.tremolo.amp.gain.value = 0
      this.a.tremolo.osc
         .connect (this.a.tremolo.wid)
         .connect (this.a.tremolo.amp.gain)

      this.a.tremolo.off = this.a.ctx.createConstantSource ()
      this.a.tremolo.off.offset.value = 1
      this.a.tremolo.off.connect (this.a.tremolo.amp.gain)
      this.a.tremolo.off.start ()

      this.a.pan = this.a.ctx.createStereoPanner ()
      if (voices.total === 1) {
         this.a.pan.pan.value = 0
      } else {
         const pan_val = (voices.index / (voices.total - 1)) * 2 - 1
         this.a.pan.pan.value = pan_val
      }
   
      this.a.amp = this.a.ctx.createGain ()
      this.a.amp.gain.value = 0
      this.a.osc.connect (this.a.tremolo.amp)
         .connect (this.a.amp)
         .connect (this.a.pan)
         .connect (this.a.ctx.destination)

      this.a.rev = this.a.ctx.createConvolver ()
      const response = await fetch (`R1NuclearReactorHall.m4a`)
      const array_buffer = await response.arrayBuffer ()
      const audio_buffer = await this.a.ctx.decodeAudioData (array_buffer)
      this.a.rev.buffer = audio_buffer

      this.a.wet = this.a.ctx.createGain ()
      this.a.wet.gain.value = 0
      this.a.amp.connect (this.a.wet)
         .connect (this.a.rev)
         .connect (this.a.ctx.destination)         
      
      if (program.is_playing) this.update_graph ()

   }

   get_wake_lock = async () => {
      if (!(`wakeLock` in navigator)) return
      const wake_lock = await navigator.wakeLock.request (`screen`)
      wake_lock.onrelease = () => location.reload ()
   }

   componentDidUpdate = () => {
      const { msg, program } = this.props
      const handle: { [key: string]: () => void } = {
         update: () => {
            console.log (`updating`)
            const new_program = msg
            // console.log (props.voices.index, program.versionstamp, new_program.versionstamp)
            // if (program.versionstamp === `init` 
            //    || new_program.versionstamp > program.versionstamp) {
            //    Object.assign (program, new_program)
            //    console.log (props.voices.index, `updating`)
            //    update_graph ()
            // }

            Object.assign (program, new_program)
            this.update_graph ()
         },
         load: () => {
            const { values } = program
            const lag_diversity = values[23] / 127
            const lag = Math.pow (values[15] / 127, 3) * 40
            const lag_time = lag * Math.pow (2, lag_diversity * random_bi ())
            console.log (`loading with lag time: ${ lag_time }s`)
            this.load_graph (msg.key, lag_time)
         },
         save: () => {
            this.save_graph (msg.key)
         }
      }

      handle[msg.type] ()
   }


   render = () => {
      return <SynthScreen />
   }
}


