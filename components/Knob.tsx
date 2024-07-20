import { useRef, useEffect } from "preact/hooks"
// import { Signal, useSignal } from "@preact/signals"

const tau: number = Math.PI * 2

export default function Knob (props: {
   size: number,
   control: number,
   value: number,
   position: {
      x: number,
      y: number
   },
}) {

   const cnv = useRef <HTMLCanvasElement> (null)
   const v = props.value

   useEffect (() => {
      const w = props.size

      if (!cnv.current) return
      cnv.current.width = w
      cnv.current.height = w
      cnv.current.style.position = `absolute`
      cnv.current.style.left = `${ props.position.x }px`
      cnv.current.style.top = `${ props.position.y }px`

      const ctx = cnv.current.getContext (`2d`)
      if (!ctx) return

      const r = tau * 0.75 * Number (v) / 127

      const k = tau * -0.125

      const p1 = {
         x: (w * 0.5) + (w * 0.4 * Math.sin (k - r)),
         y: (w * 0.5) + (w * 0.4 * Math.cos (k - r))
      }

      const p2 = {
         x: (w * 0.5) + (w * 0.2 * Math.sin (k - r)),
         y: (w * 0.5) + (w * 0.2 * Math.cos (k - r))
      }

      ctx.fillStyle = `darkmagenta`
      ctx.fillRect (0, 0, w, w)

      ctx.strokeStyle = `white`
      ctx.lineWidth = w * 0.1

      ctx.beginPath ()
      ctx.arc (w * 0.5, w * 0.5, w * 0.3, r, tau * 0.75 + r, false)
      ctx.moveTo (p1.x, p1.y)
      ctx.lineTo (p2.x, p2.y)
      ctx.stroke ()

      ctx.fillStyle = `white`
      ctx.font = `bold ${ w * 0.2 }px sans-serif`

      ctx.textAlign = `center`
      ctx.fillText (v.toString (), w * 0.5, w * 0.57)

      ctx.font = `bold ${ w * 0.15 }px sans-serif`
      ctx.textAlign = `left`
      ctx.fillText (props.control.toString (), w * 0.03, w * 0.15)
   }, [ v ])

   return (
      <canvas ref={ cnv }></canvas>
   )

}

 