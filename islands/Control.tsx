// import ControlInterface from "../components/ControlInterface.tsx"
import { useEffect } from "preact/hooks"
import { Signal, signal } from "@preact/signals"
import Knob from "./Knob.tsx"
import IsPlayingIndicator from "./IsPlayingIndicator.tsx"
import { UpdateMessage } from "../components/UpdateMessage.tsx"

const v: Signal <number> [] = []

for (let i = 0; i < 24; i++) {
   v.push (signal<number> (0))
}

const is_playing = signal (false)
const is_updating = signal (false)

const update = () => {
   const payload = {
      is_playing: is_playing.value,
      values: v.map (v => v.value)
   }
   const json = JSON.stringify (payload)
   console.log (`updating: ${ json }`)
   fetch (`/api/update`, {
      method: `POST`,
      headers: {
         "Content-Type": `application/json`
      },
      body: json
   })

   document.createElement (`div`).innerText = `updated`
   document.body.appendChild (document.createElement (`div`))

   toggle_is_updating ()
   setTimeout (() => toggle_is_updating (), 1000)

}

const toggle_is_updating = () => {
   is_updating.value = !is_updating.value
}

const toggle_is_playing = () => {
   is_playing.value = !is_playing.value
   update ()
}

export default function Control () {

   const matrix = []
   const w = (globalThis.innerWidth / 2) - 400
   const h = (globalThis.innerHeight / 2) - 150


   for (let j = 0; j < 3; j++) {
      for (let i = 0; i < 8; i++) {
         matrix.push (
            <Knob 
               size={ 100 }
               control={ 8 + i + (j * 8)}
               value={ v[i + (j * 8)].value }
               position={{ x: i * 100 + w, y: j * 100 + h }}
            />
         )
      }   
   }

   useEffect (() => {
      globalThis.onkeydown = e => {

         const key_handler: { [ key: string ]: () => void } = {
            Enter: () => update (),
            p: () => toggle_is_playing (),
         }

         let safe = false
         for (const key in key_handler) {
            if (e.key === key) {
               safe = true
               break
            }
         }
         if (!safe) return

         key_handler[e.key] ()
      }

      const midi_handler = (e: MIDIMessageEvent) => {
         const [status, control, value] = e.data as Uint8Array
         if (status === 176) {
            v[control - 8].value = Number (value)
         }
      }

      const init_midi = async () => {
         const midi = await navigator.requestMIDIAccess ()
         midi.inputs.forEach (device => {
            device.onmidimessage = midi_handler
         })

         midi.onstatechange = (e: Event) => {
            const midi_event = e as MIDIConnectionEvent
            if (midi_event.port instanceof MIDIInput && midi_event.port.state === `connected`) {
               midi_event.port.onmidimessage = midi_handler
            }
         }
      }

      init_midi ()
   }, [])


   return <>
      <IsPlayingIndicator 
         size={ 60 }
         position={{ x: globalThis.innerWidth - 80, y: 20 }}
         is_playing={ is_playing.value }
      />
      <div style="
         background: darkmagenta;
         position: absolute;
         user-select: none;
         height: 100vh;
         width: 100vw;
         color: white;
         left: 0;
         top: 0;
      ">{ matrix }</div>
      <UpdateMessage is_visible={ is_updating.value } />
   </>
}