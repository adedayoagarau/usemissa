import { ContentIssueReportDialog } from "@/components/content-issue-report-dialog";

export function OpportunityIssueReport({ opportunityId, opportunityName, signedIn, subjectPath }: { opportunityId: string; opportunityName: string; signedIn: boolean; subjectPath: string }) {
  return (
    <div className="border-t border-border pt-4">
      <ContentIssueReportDialog
        subjectType="opportunity"
        subjectId={opportunityId}
        subjectName={opportunityName}
        subjectPath={subjectPath}
        signedIn={signedIn}
        allowedIssues={["deadline-or-status", "fee-or-eligibility", "broken-official-link", "duplicate-record", "other"]}
      />
    </div>
  );
}
