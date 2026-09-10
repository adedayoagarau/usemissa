import assert from 'node:assert/strict';
import {calendarSourceEvents,calendarEventsOnDay,calendarConflicts} from '../../apps/web/lib/calendar-planning.ts';
import {relationalCalendarFeed} from '../../apps/web/lib/creator-calendar.ts';

const tracked=[{opportunityId:'a',title:'Residency',myStatus:'saved',deadline:'2026-11-01',deadlineKind:'exact'},{opportunityId:'b',title:'Grant',myStatus:'accepted',deadline:'2026-11-01',expectedResponseBy:'2026-11-03'},{opportunityId:'c',title:'Fellowship',myStatus:'saved',deadline:'2026-11-02',deadlineKind:'inferred'}];
for(const zone of ['America/Los_Angeles','Pacific/Auckland','UTC']){
  process.env.TZ=zone;
  const events=calendarSourceEvents(tracked,[{id:'reminder',opportunityId:'a',title:'Draft proposal',state:'scheduled',dueAt:'2026-11-01T17:00:00Z',kind:'preparation',revision:1,inAppEnabled:false}], [{id:'goal',title:'Send applications',ends_on:'2026-11-05',state:'active',target:3,progress:1}]);
  assert(calendarEventsOnDay(events,'2026-11-01').some(e=>e.id==='deadline:a'),`${zone}: all-day deadline stays on its date through daylight-saving change`);
  assert(!calendarEventsOnDay(events,'2026-10-31').some(e=>e.id==='deadline:a'));
  assert(!events.some(e=>e.id.endsWith(':b')),'outcome stops deadline and response events');
  assert(events.find(e=>e.id==='deadline:c').sourceLabel.includes('checking'));
  assert.equal(events.find(e=>e.id==='deadline:a').actionHref,'/tracker?application=a');
  assert.equal(events.find(e=>e.id==='reminder:reminder').startAt,'2026-11-01T17:00:00.000Z','timed reminders retain their instant');
  assert(events.find(e=>e.id==='reminder:reminder').sourceLabel.includes('Notifications off'));
  const session={id:'session',kind:'personal',title:'Writing',startAt:'2026-11-01T09:00:00',endAt:'2026-11-01T11:00:00'};
  assert.equal(calendarConflicts([...events,session],{startAt:'2026-11-01T10:00:00',endAt:'2026-11-01T12:00:00'}).length,1,'only booked personal time creates a conflict');
  assert.equal(calendarConflicts([session],{startAt:session.endAt,endAt:'2026-11-01T12:00:00'}).length,0,'adjacent slots do not conflict');
  assert.equal(calendarConflicts([session],session).length,0,'editing a session does not conflict with itself');
  assert.equal(calendarEventsOnDay([{...session,startAt:'2026-11-01T22:00:00',endAt:'2026-11-03T00:00:00'}],'2026-11-02').length,1,'multi-day commitments remain visible');
}
const feed=relationalCalendarFeed(tracked);
assert(feed.includes('Closes: Residency'));assert(!feed.includes('Closes: Fellowship'),'uncertain deadlines do not become authoritative calendar subscriptions');
console.log('PASS: date-only deadlines across timezones/DST, timed reminders, closed outcomes, exact links, multi-day commitments, overlap boundaries and uncertain feed dates.');
