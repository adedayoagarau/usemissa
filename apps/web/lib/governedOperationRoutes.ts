export function crmWriteError(error: unknown): { status: 400 | 404 | 409 | 503; message: string } {
  const value = error instanceof Error ? error : new Error('CRM write unavailable');
  if (value.name === 'ConflictError') return { status: 409, message: 'CRM write conflicts with existing durable state.' };
  if (value.name === 'NotFoundError') return { status: 404, message: 'CRM resource not found.' };
  const badRequest = value.message === 'Invalid idempotency key' || value.message.startsWith('Invalid CRM') || value.message.startsWith('Exactly one CRM') || value.message === 'Exact confirmation is required';
  return badRequest ? { status: 400, message: value.message } : { status: 503, message: 'CRM write unavailable.' };
}

export function agentControlErrorStatus(error: unknown): 400 | 404 | 503 {
  const message = error instanceof Error ? error.message : 'Agent control unavailable';
  if (message === 'Invalid idempotency key' || message === 'Unsupported agent control action' || message === 'Invalid agent target id' || message === 'Invalid expected agent state' || message === 'Exact confirmation is required') return 400;
  return message === 'Agent target not found' ? 404 : 503;
}

function stripeReferenceId(value: unknown): string | undefined {
  if (typeof value === 'string' && value) return value;
  if (value && typeof value === 'object' && typeof (value as Record<string, unknown>).id === 'string') return (value as Record<string, unknown>).id as string;
  return undefined;
}

export function stripeReceiptReferences(object: Record<string, unknown>): { customerId?: string; subscriptionId?: string; invoiceId?: string } {
  const objectType = typeof object.object === 'string' ? object.object : undefined;
  const objectId = stripeReferenceId(object.id);
  const customerId = stripeReferenceId(object.customer) ?? (objectType === 'customer' ? objectId : undefined);
  const subscriptionId = stripeReferenceId(object.subscription) ?? (objectType === 'subscription' ? objectId : undefined);
  const invoiceId = stripeReferenceId(object.invoice) ?? (objectType === 'invoice' ? objectId : undefined);
  return { ...(customerId ? { customerId } : {}), ...(subscriptionId ? { subscriptionId } : {}), ...(invoiceId ? { invoiceId } : {}) };
}
