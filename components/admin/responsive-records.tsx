 'use client';
import {Children,isValidElement,useState,type ReactNode,type ReactElement} from 'react';
import {ChevronDown} from 'lucide-react';
export function ResponsiveRecords({children}:{children:ReactNode}){
 const [expanded,setExpanded]=useState<Record<string,boolean>>({});
 const rows=Children.toArray(children).filter(isValidElement) as ReactElement<{children?:ReactNode}>[];
 const fields=(row:ReactElement<{children?:ReactNode}>)=>Children.toArray(row.props.children).filter(isValidElement) as ReactElement<{children?:ReactNode;'data-label'?:string}>[];
 const headers=rows.length?fields(rows[0]).map(f=>f.props['data-label']||'Details'):[];
 return <div className="responsive-records"><table><thead><tr>{headers.map((h,i)=><th key={i}>{h}</th>)}</tr></thead><tbody>{rows.map((row,i)=>{const key=String(row.key??i),open=!!expanded[key];return <tr key={key} className={open?'record-expanded':''}>{fields(row).map((f,j)=><td key={j} data-label={f.props['data-label']}>{j===0?<div className="record-summary"><div>{f.props.children}</div><button type="button" className="record-toggle" aria-label={open?'Collapse details':'Expand details'} aria-expanded={open} onClick={()=>setExpanded(v=>({...v,[key]:!open}))}><ChevronDown size={19}/></button></div>:f.props.children}</td>)}</tr>})}</tbody></table></div>
}
