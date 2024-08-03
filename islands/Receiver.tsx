
import { useSignal, Signal } from "@preact/signals"
import { useEffect } from "preact/hooks"
import { SynthSplash } from "../components/SynthSplash.tsx"
import Synth from "./Synth.tsx";
import { Program } from "../shared/types.ts";

interface MsgType {
   is_playing: boolean;
   type: string;
   values: number[];
   versionstamp: string;
   program: {
     values: number[];
   };
   key: string;
 }

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
      enabled.value = true
   }

   const msg = useSignal<MsgType> ({
      is_playing: false,
      type: `update`,
      values: Array.from ({ length: 24 }, () => 0),
      versionstamp: `init`,
      program: {
         values: Array.from ({ length: 24 }, () => 0),
      },
      key: ``,
   })


   useEffect (() => {
 
      const es = new EventSource (`/api/listen`)
      es.onmessage = e => {
         msg.value = JSON.parse (e.data)
         if (msg.value.type === `load`) {
            program.values = msg.value.values
         }

      }

   }, [])

   if (enabled.value) {
      const synth_array = Array.from ({ length: size }, (_, i) => {
         // console.dir (program.values[15])
         // console.dir (program)
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