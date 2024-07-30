
import { useSignal, Signal } from "@preact/signals"
import { useEffect } from "preact/hooks"
import { SynthSplash } from "../components/SynthSplash.tsx"
import Synth from "./Synth.tsx";
import { Program } from "../shared/types.ts";

let a: AudioContext

export default function Reciever (props: {
   enabled: boolean,
   size: number,
   program: Program,
}) {
   const { size, program } = props
   const enabled = useSignal (props.enabled)

   useEffect (() => {
      a = new AudioContext ()
      a.suspend ()
   }, [])

   const enable = async () => {
      await a.resume ()
      console.log (`enabling:`, a)
      enabled.value = true
   }

   const msg = useSignal ({
      is_playing: false,
      type: `update`,
      values: Array.from ({ length: 24 }, () => 0),
      versionstamp: `init`,
      key: ``,
   })

   useEffect (() => {
 
      const es = new EventSource (`/api/listen`)
      es.onmessage = e => {
         msg.value = JSON.parse (e.data)
      }

   }, [])

   if (enabled.value) {
      const synth_array = Array.from ({ length: size }, (_, i) => {
         return <Synth 
            enabled={ true } 
            program={ program } 
            msg={ msg.value }
            voices={{ total: size, index: i }} 
            ctx={ a }
         />
      })

      return <>{ ...synth_array }</>
   }
   else return <div onPointerDown={ enable }><SynthSplash /></div>
}