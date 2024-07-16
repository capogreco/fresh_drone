import { useRef, useEffect } from "preact/hooks"

const note_to_name = (note: number) => {
   const notes = `C -C#-D -D#-E -F -F#-G -G#-A -A#-B `.split (`-`)
   const octave = Math.floor (note / 12) - 1
   const name = notes[note % 12]
   return `${ name }${ octave }`
}

export function ParameterIndicator (props: {
   control: number,
   value: number,
   // values: number [],
   is_visible: boolean,
}){
   const { control, value, is_visible } = props

   const handler: { [key: number]: (v: number) => string } = {
      // root
      8: (v: number) => `note: ${ note_to_name (v) }`,
      16: (v: number) => `finetune: ${ (v * 2 / 128 - 1).toFixed (2) }`,
      24: (v: number) => `detune: ${ (v / 127).toFixed (2) }`,

      // global
      15: (v: number) => `volume: ${ (v / 127).toFixed (2) }`,
      23: (v: number) => `lag: ${ (Math.pow (v / 127, 3) * 40).toFixed (2) }s`,
      31: (v: number) => `lag diversity: ${ (v / 127).toFixed (2) }`,
   }

   const is_handleable = control in handler
   if (!is_handleable) return null

   const msg = handler[control](value)
   
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
