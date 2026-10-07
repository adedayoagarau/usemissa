'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CountBadge } from '@/components/missa/count-badge';

/**
 * The Messages page body: letters, submitter questions and the recorded
 * delivery history as three views of one desk. Opens on questions when some
 * are waiting and there are no letters to work on.
 */
export function MessagesWorkspace({ letters, questions, history, letterCount, waitingQuestions, historyCount }: { letters: React.ReactNode; questions: React.ReactNode; history: React.ReactNode; letterCount: number; waitingQuestions: number; historyCount?: number }) {
  const [tab, setTab] = useState(letterCount === 0 && waitingQuestions > 0 ? 'questions' : 'letters');
  return (
    <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
      <TabsList variant="line" aria-label="Messages views">
        <TabsTrigger value="letters">Letters <CountBadge count={letterCount} label="letters" /></TabsTrigger>
        <TabsTrigger value="questions">Questions <CountBadge count={waitingQuestions} label="waiting" /></TabsTrigger>
        <TabsTrigger value="history">Delivery record{historyCount !== undefined ? <> <CountBadge count={historyCount} label="records" /></> : null}</TabsTrigger>
      </TabsList>
      <TabsContent value="letters" className="pt-4">{letters}</TabsContent>
      <TabsContent value="questions" className="pt-4">{questions}</TabsContent>
      <TabsContent value="history" className="pt-4">{history}</TabsContent>
    </Tabs>
  );
}
