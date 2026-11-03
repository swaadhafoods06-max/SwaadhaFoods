'use client';
import { ReactNode, useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';
import styles from './order-popup.module.css';
export function OrderPopup({open,onClose,title,children}:{open:boolean;onClose:()=>void;title:string;children:ReactNode}) {
 const ref=useRef<HTMLDialogElement>(null);const id=useId();
 useEffect(()=>{const el=ref.current;if(!open||!el)return;el.showModal();const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{el.close();document.body.style.overflow=old}},[open]);
 return <dialog ref={ref} className={styles.dialog} aria-labelledby={id} onCancel={e=>{e.preventDefault();onClose()}} onClick={e=>{if(e.target===e.currentTarget){const b=e.currentTarget.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)onClose()}}}><div className={styles.head}><h2 id={id}>{title}</h2><button type="button" onClick={onClose} aria-label="Close popup"><X size={18}/></button></div><div className={styles.body}>{children}</div></dialog>
}
