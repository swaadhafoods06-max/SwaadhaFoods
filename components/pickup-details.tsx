'use client';
import {useEffect,useState} from 'react';
import {Download,MapPin} from 'lucide-react';
import {supabase as storeClient} from '@/lib/supabase';
import {supabase as adminClient} from '@/lib/supabase-admin';
import {OrderPopup} from './order-popup';
import styles from './order-popup.module.css';
type Pickup={address:string;name:string;orderNumber:string;date:string};
export function PickupNotice(){return <div className={styles.card}><h3>Prebook now for Diwali</h3><p><b>Place: BANGALORE</b></p><p><b>Pickup date: 7 November</b><br/>Porter charges self-pay. Book it yourself.</p><p>Delivery within Bangalore only.</p><p>Order number and name must be informed during pickup.</p><small>The pickup address is shown only after you place an order.</small></div>}
export function PickupDetails({orderId,autoOpen=false,admin=false}:{orderId:string;autoOpen?:boolean;admin?:boolean}){
 const [data,setData]=useState<Pickup|null>(null),[error,setError]=useState(''),[open,setOpen]=useState(autoOpen),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  let live=true;const controller=new AbortController();
  setError('');setData(null);
  const timer=setTimeout(()=>{controller.abort();if(live)setError('Pickup details are taking longer than expected. Please try again. Your order is already placed.');},15000);
  async function load(){try{
   const client=admin?adminClient:storeClient;
   const session=await client?.auth.getSession();
   if(!live||controller.signal.aborted)return;
   const token=session?.data.session?.access_token;
   if(!token)throw new Error('Please sign in again to view pickup details.');
   const response=await fetch('/api/orders/'+orderId+'/pickup',{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:controller.signal});
   if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('Pickup details are temporarily unavailable. Please try again.');
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||'Could not load pickup details.');
   if(!result.address||!result.orderNumber)throw new Error('Pickup details could not be loaded. Please try again.');
   if(live){setData(result);setError('');}
  }catch(e){if(live&&!controller.signal.aborted)setError((e as Error).message)}finally{if(!controller.signal.aborted)clearTimeout(timer)}}
  load();return()=>{live=false;clearTimeout(timer);controller.abort()};
 },[orderId,admin,attempt]);

 function download(){if(!data)return;const text=`Swaadha — Pickup details\nOrder #${data.orderNumber}\nName: ${data.name}\nPlace: BANGALORE\nPickup date: ${data.date}\nPorter charges self-pay. Book it yourself.\nDelivery within Bangalore only.\nInform your order number and name during pickup.\nPickup address: ${data.address}\n`;const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`Swaadha-pickup-${data.orderNumber}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 const content=<>{data?<><p><b>Order #{data.orderNumber} · {data.name}</b></p><p>Place: BANGALORE<br/>Pickup date: {data.date}</p><p>Porter charges self-pay. Book it yourself.<br/>Delivery within Bangalore only.</p><p><b>Inform your order number and name during pickup.</b></p><p><MapPin size={16}/> <b>Pickup address</b><br/>{data.address}</p><button type="button" className={styles.button} onClick={download}><Download size={16}/>Download pickup details</button></>:<div role="status"><p>{error||'Loading pickup details…'}</p>{error&&<button type="button" className={styles.button} onClick={()=>setAttempt(n=>n+1)}>Try again</button>}</div>}</>;
 return <><section className={styles.card}><h3>Pickup details</h3>{content}<button type="button" className={styles.button} onClick={()=>setOpen(true)}>View pickup instructions</button></section><OrderPopup open={open} onClose={()=>setOpen(false)} title="Your order pickup">{content}</OrderPopup></>
}
