import { useRef, useEffect } from "preact/hooks"

export function ParameterIndicator (props: {
   control: number,
   value: number,
   values: number [],
   is_visible: boolean,
}){
   const { control, value, values, is_visible } = props
   const div = useRef <HTMLDivElement> (null)
   
   useEffect (() => {
      if (!div.current) return

      div.current.style.display = is_visible ? `flex` : `none`
   }, [ is_visible ])
return (
   <div ref={ div } style="
      font: italic bolder 40px sans-serif;
      justify-content: center;
      align-items: center;
      user-select: none;
      position: fixed;
      width: 100vw;
      color: white;
      z-index: 1;
      top: 20;
      "
   >CONTROL { control } : { value } </div>
);
}
