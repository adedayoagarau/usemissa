import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { creatorCommandEnvelope, CreatorCalendarError } from '@missa/radar-adapters';
import { getSessionAccount } from '@/lib/auth';
import { getCreatorCalendarRepository } from '@/lib/creatorRepositories';

const headers={'Cache-Control':'private, no-store'};
const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers});
const eventId=(key:string)=>`calendar_${createHash('sha256').update(`calendar:${key}`).digest('hex').slice(0,32)}`;

export async function GET(request:Request){const session=await getSessionAccount(request.headers.get('cookie'));if(!session)return json({error:'Not authenticated'},401);const repository=getCreatorCalendarRepository();if(!repository)return json({error:'Calendar is unavailable.'},503);const url=new URL(request.url),from=new Date(url.searchParams.get('from')??''),to=new Date(url.searchParams.get('to')??'');if(!Number.isFinite(from.getTime())||!Number.isFinite(to.getTime())||to<=from)return json({error:'Choose a valid calendar range.'},400);const [events,tracker]=await Promise.all([repository.events(session.account.id,from,to),repository.trackerItems(session.account.id)]);return json({events,tracker});}

export async function POST(request:Request){const session=await getSessionAccount(request.headers.get('cookie'));if(!session)return json({error:'Not authenticated'},401);const repository=getCreatorCalendarRepository();if(!repository)return json({error:'Calendar is unavailable.'},503);const key=request.headers.get('Idempotency-Key')?.trim();const body=await request.json().catch(()=>undefined);if(!key||!body||typeof body!=='object')return json({error:'Event details and Idempotency-Key are required.'},400);try{const id=eventId(key),receipt=await repository.createEvent(creatorCommandEnvelope(session.account.id,'calendar-event.create',key,{id,...body},1),{id,...body} as never);return json({event:(await repository.events(session.account.id,new Date('1970-01-01'),new Date('2100-01-01'))).find((item)=>item.id===id),receipt},201);}catch(error){return calendarError(error);}}

function calendarError(error:unknown){return error instanceof CreatorCalendarError?json({error:error.message},error.message.includes('changed')?409:400):json({error:'We could not update this event.'},500);}
