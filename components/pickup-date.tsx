'use client';
import {useEffect,useState} from 'react';
import {loadPickupSettings,formatPickupDate,type PickupSettings} from '@/lib/pickup';
export function PickupText({text}:{text:string}){
 const [settings,setSettings]=useState<PickupSettings|null>(null);
 useEffect(()=>{if(!text.includes('7 November'))return;let live=true;const load=()=>loadPickupSettings().then(value=>{if(live)setSettings(value)}).catch(()=>{});load();window.addEventListener('focus',load);return()=>{live=false;window.removeEventListener('focus',load)}},[text]);
 if(!text.includes('7 November'))return <>{text}</>;
 if(!settings||!settings.enabled)return <>{text.includes('Pickup date:')||text.startsWith('Pickup date:')?'Made fresh to order. Please allow 6–7 days for preparation. Delivery within Bangalore only.': 'Made fresh to order · Bangalore only'}</>;
 return <>{text.replaceAll('7 November',formatPickupDate(settings.pickup_date))}</>;
}
