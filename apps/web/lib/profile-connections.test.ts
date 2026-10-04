import assert from "node:assert/strict";
import test from "node:test";
import { inquiryInput, invitationInput } from "./profile-connections";
import { portfolioSchema } from "./creator-portfolio-schema";
import {
  renderProfileInquiryEmail,
  renderProfileInvitationEmail,
} from "../emails/profile-connections";

const valid = {
  name: "Ada Mensah",
  email: "ada@example.com",
  topic: "commission",
  message: "Could we talk about a commission?",
};

test("inquiries need a name, a real email, a known topic and a few words", () => {
  assert.equal(inquiryInput.safeParse(valid).success, true);
  assert.equal(
    inquiryInput.safeParse({ ...valid, email: "nope" }).success,
    false,
  );
  assert.equal(
    inquiryInput.safeParse({ ...valid, topic: "spam" }).success,
    false,
  );
  assert.equal(
    inquiryInput.safeParse({ ...valid, message: "hi" }).success,
    false,
  );
  assert.equal(inquiryInput.safeParse({ ...valid, name: "  " }).success, false);
  // A filled honeypot still parses, so the route can drop it without a tell.
  const bot = inquiryInput.safeParse({
    ...valid,
    website: "https://spam.example",
  });
  assert.equal(bot.success && bot.data.website, "https://spam.example");
});

test("invitations name an organization and a call; the note is optional", () => {
  assert.deepEqual(
    invitationInput.parse({ organizationId: "org", opportunityId: "opp" }),
    { organizationId: "org", opportunityId: "opp", message: "" },
  );
  assert.equal(
    invitationInput.safeParse({ organizationId: "org" }).success,
    false,
  );
});

test("profiles take messages and invitations unless the creator turns them off", () => {
  const parsed = portfolioSchema.parse({});
  assert.equal(parsed.inquiries, true);
  assert.equal(parsed.invitations, true);
  assert.equal(portfolioSchema.parse({ inquiries: false }).inquiries, false);
});

test("notification emails quote the sender and never include the creator's address", () => {
  const inquiry = renderProfileInquiryEmail({
    senderName: "Ada <b>Mensah</b>",
    topic: "booking",
    message: "A reading in November?",
  });
  assert.match(inquiry.subject, /wrote to you on Missa/);
  assert.match(inquiry.text, /A reading in November\?/);
  assert.doesNotMatch(inquiry.html, /<b>Mensah<\/b>/);
  const invitation = renderProfileInvitationEmail({
    organizationName: "The Quiet Review",
    opportunityTitle: "Spring reading period",
    opportunityPath: "/opportunities/spring",
    deadline: "2026-11-30",
    message: "",
  });
  assert.match(invitation.subject, /The Quiet Review invited you to apply/);
  assert.match(invitation.html, /\/opportunities\/spring/);
});
