import { Handlers, PageProps } from "$fresh/server.ts"
import { Program } from "../shared/types.ts"
import { get_program } from "../shared/db.ts"
import Receiver from "../islands/Receiver.tsx"

export const handler: Handlers = {
   async GET (_req: any, ctx: any) {
      const program = await get_program ()
      return ctx.render (program)
   }
}

export default function SynthClient (props: PageProps<Program>) {
   return (
      <Receiver enabled={ false } program={ props.data } size={ 6 } />
   )
}
