import { useRef, useEffect } from "preact/hooks"
// import { Signal, useSignal } from "@preact/signals"

// const tau: number = Math.PI * 2

export default function IsPlayingIndicator (props: {
   size: number,
   position: {
      x: number,
      y: number
   },
   is_playing: boolean,
}) {

   const cnv = useRef <HTMLCanvasElement> (null)
   const { is_playing, size } = props

   useEffect (() => {

      if (!cnv.current) return
      cnv.current.width  = size
      cnv.current.height = size
      cnv.current.style.position = `absolute`
      cnv.current.style.left = `${ props.position.x }px`
      cnv.current.style.top  = `${ props.position.y }px`
      cnv.current.style.zIndex = `1`

      const ctx = cnv.current.getContext (`2d`)
      if (!ctx) return

      ctx.fillStyle = `darkmagenta`
      ctx.fillRect (0, 0, size, size)

      if (is_playing) {
         ctx.fillStyle = `white`
         ctx.beginPath ()
         ctx.moveTo (0, 0)
         ctx.lineTo (0, size)
         ctx.lineTo (size, size * 0.5)
         ctx.closePath ()
         ctx.fill ()
      }
      else {
         ctx.fillStyle = `white`
         ctx.fillRect (0,0, size, size)
      }

   }, [ is_playing ])

   return (
      <canvas ref={ cnv }></canvas>
   )

}

 