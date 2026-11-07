import {supabase} from './supabase';
export type PickupSettings={pickup_date:string;enabled:boolean};
export async function loadPickupSettings():Promise<PickupSettings>{
 if(!supabase)throw new Error('Pickup settings are unavailable.');
 const {data,error}=await supabase.from('pickup_settings').select('pickup_date,enabled').eq('id',1).single();
 if(error||!data?.pickup_date)throw new Error('Pickup settings are unavailable. Please contact the kitchen.');
 return data;
}
export async function loadPickupDate(){
 const settings=await loadPickupSettings();
 if(settings.enabled)return settings.pickup_date;
 const date=new Date();date.setDate(date.getDate()+7);
 return date.toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
}
export function formatPickupDate(date:string){return new Date(date+'T12:00:00+05:30').toLocaleDateString('en-IN',{day:'numeric',month:'long',timeZone:'Asia/Kolkata'})}
