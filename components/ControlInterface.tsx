// import { resetPropWarnings } from "preact/debug";
// import Control from "../islands/Control.tsx"

export default function ControlInterface (props: { submit: (e: SubmitEvent) => void }){
   return (<div style="
      position:fixed;
      color: white;
      background-color: black;
      font: italic bolder 24px sans-serif;
      top:0;
      left:0;
      width:100vw;
      height:100vh;
      background-color: ;
      display:flex;
      justify-content:center;
      align-items:center;
   "><form onSubmit={ props.submit }>
      <table style="table-layout:fixed;"><tbody>

         <tr>
            <td style="text-align:left"><label>POWER</label></td>
            <td style="text-align:right"><input name="is_playing" type="checkbox" /></td>
         </tr>

         <tr>
            <td><label>FREQ</label></td>
            <td style="text-align:right"><input name="frequency" value={ 440 } /></td>
         </tr>

         <tr>
            <td><label>LAG</label></td>
            <td style="text-align:right"><input name="lag_time" value={ 0 }/></td>
         </tr>

         <tr>
            <td><label>AMP</label></td>
            <td style="text-align:right"><input name="amplitude" value={ 0.4 } /></td>
         </tr>
         
         <tr>
            <td style="text-align:right" colspan={ 2 }><button type="submit">submit</button></td>
         </tr>

      </tbody></table>
   
   </form></div>)
}