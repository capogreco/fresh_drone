import { useRef, useEffect } from "preact/hooks"
import { siq_gen } from "../shared/siq_gen.ts"
import { JSX } from "preact/jsx-runtime";

const note_to_name = (note: number) => {
   const notes = `C -C#-D -D#-E -F -F#-G -G#-A -A#-B `.split (`-`)
   const octave = Math.floor (note / 12) - 1
   const name = notes[note % 12]
   return `${ name }${ octave }`
}

export function ParameterIndicator (props: {
   control: number,
   value: number,
   values: number [],
   is_visible: boolean,
}){
   const { control, value, values, is_visible } = props

   const handler: { [key: number]: (v: number) => string | JSX.Element  } = {
      // root
      8: (v: number) => `note: ${ note_to_name (v) }`,
      16: (v: number) => `finetune: ${ (v * 2 / 128 - 1).toFixed (2) }`,
      24: (v: number) => `detune: ${ (v / 127).toFixed (2) }`,

      // harmonic
      9: (v: number) => {
         const num_max = Math.floor (v * 11 / 127) + 1 
         const den_max = Math.floor (values[9] * 11 / 127) + 1
         const unity = values[17] / 128

         const [ num, den ] = siq_gen (num_max, den_max, unity)

         return <div>
            numerator:  { num_max }
            <br />[ { num.join (`, `) } ] 
            <br />[ { den.join (`, `) } ] 
         </div>
      },
      17: (v: number) => {
         const num_max = Math.floor (values[1] * 11 / 127) + 1 
         const den_max = Math.floor (v * 11 / 127) + 1
         const unity = values[17] / 128

         const [ num, den ] = siq_gen (num_max, den_max, unity)

         return <div>
            denominator: { den_max }
            <br />[ { num.join (`, `) } ] 
            <br />[ { den.join (`, `) } ] 
         </div>
      },
      25: (v: number) => {      
         const num_max = Math.floor (values[1] * 11 / 127) + 1 
         const den_max = Math.floor (values[9] * 11 / 127) + 1
         const unity = v / 128

         const [ num, den ] = siq_gen (num_max, den_max, unity)

         return <div>
            unity: { unity.toFixed (2) }
            <br />[ { num.join (`, `) } ] 
            <br />[ { den.join (`, `) } ] 
         </div>
      },

      // tremolo
      10: (v: number) => `tremolo: ${ (v / 127).toFixed (2) }`,

      // reverb
      // 14: (v: number) => `reverb feedback: ${ (v / 127).toFixed (2) }`,
      22: (v: number) => `reverb amount: ${ (v / 127).toFixed (2) }`,
      30: (v: number) => `reverb diversity: ${ (v / 127).toFixed (2) }`,

      // global
      15: (v: number) => `volume: ${ (v / 127).toFixed (2) }`,
      23: (v: number) => `lag: ${ (Math.pow (v / 127, 3) * 40).toFixed (2) }s`,
      31: (v: number) => `lag diversity: ${ (v / 127).toFixed (2) }`,
   }

   const is_handleable = control in handler
   

   const msg = is_handleable 
      ? handler[control](value) 
      : `cc ${ control } : ${ value }`
   
   const div = useRef <HTMLDivElement> (null)
   
   useEffect (() => {
      if (!div.current) return

      div.current.style.display = is_visible ? `flex` : `none`
   }, [ is_visible ])
return (
   <div ref={ div } style="
      font: italic bolder 40px monospace;
      justify-content: left;
      align-items: center;
      user-select: none;
      position: fixed;
      color: white;
      z-index: 1;
      left: 40px;
      top: 30px;
      "
   >{ msg }</div>
);
}
