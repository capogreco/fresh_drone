import { useRef, useEffect } from "preact/hooks"

export function UpdateMessage (props: {
   is_visible: boolean,
}){   
   const { is_visible } = props
   const div = useRef <HTMLDivElement> (null)
   
   useEffect (() => {
      if (!div.current) return
      div.current.style.top = `${ globalThis.innerHeight  - 100}px`

      div.current.style.display = is_visible ? `flex` : `none`
   }, [ is_visible ])


   return (
      <div ref={ div } style="
         font: italic bolder 80px sans-serif;
         justify-content: center;
         align-items: center;
         user-select: none;
         position: fixed;
         width: 100vw;
         color: white;
         z-index: 1;"
      >UPDATING</div>
   );
 }
 