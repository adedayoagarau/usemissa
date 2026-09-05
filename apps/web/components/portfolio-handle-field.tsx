"use client";
import { useEffect, useState, useId } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
export function PortfolioHandleField({value,onChange,current,name,sample=false}:{value:string;onChange:(value:string)=>void;current:string;name:string;sample?:boolean}) {
 const id=useId();
 const [check,setCheck]=useState({value:'',status:''});
 const suggestion=name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'').slice(0,30);
 const localStatus=!value?'Choose this whenever you’re ready. It is required only to publish.':value===current?'This is your current profile address.':!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(value)?'Use 3–30 letters, numbers or hyphens; start and end with a letter or number.':sample?'Availability is checked when you sign in. This preview does not reserve a handle.':'';
 const status=localStatus || (check.value===value?check.status:'Checking availability…');
 useEffect(()=>{
  if(localStatus)return;
  const controller=new AbortController();
  const timer=setTimeout(async()=>{
   try {const res=await fetch(`/api/me/handles/availability?handle=${encodeURIComponent(value)}`,{signal:controller.signal});const data=await res.json();if(!res.ok)throw new Error(data.error);if(!controller.signal.aborted)setCheck({value,status:data.available?'Available · reserved when you publish.':'Already in use. Try adding your middle name or practice.'});}
   catch(error) {if(!controller.signal.aborted)setCheck({value,status:error instanceof Error?error.message:'Could not check. Try again shortly.'});}
  },500);
  return()=>{clearTimeout(timer);controller.abort();};
 },[value,localStatus]);
 return <div>
  <label htmlFor={id}>Handle</label>
  <Input id={id} value={value} onChange={e=>onChange(e.target.value.toLowerCase().replace(/^@/,''))} autoCapitalize="none" autoCorrect="off" maxLength={30} aria-describedby={`${id}-feedback`} placeholder="yourname" />
  <p>Profile link: <strong>usemissa.com/@{value || 'yourname'}</strong></p>
  <p id={`${id}-feedback`} role="status">{status}</p>
  {status.startsWith('Already in use') && <div>{['art','studio'].map(suffix=><Button key={suffix} variant="outline" onClick={()=>onChange(`${value.slice(0,22)}-${suffix}`)}>Try @{value.slice(0,22)}-{suffix}</Button>)}</div>}
  {!value&&suggestion.length>=3&&<Button variant="outline" onClick={()=>onChange(suggestion)}>Use @{suggestion}</Button>}
 </div>;
}
