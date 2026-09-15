export type SignupIdentity = Readonly<{
  givenName: string;
  familyName?: string;
  usesSingleName: boolean;
  displayName: string;
}>;

export type SignupIdentityError = Readonly<{
  field: "givenName" | "familyName";
  message: string;
}>;

export function signupIdentity(input: {
  givenName: unknown;
  familyName: unknown;
  usesSingleName: unknown;
}): SignupIdentity | SignupIdentityError {
  const givenName =
    typeof input.givenName === "string" ? input.givenName.trim() : "";
  const familyName =
    typeof input.familyName === "string" ? input.familyName.trim() : "";
  const usesSingleName = input.usesSingleName === true;

  if (!givenName || givenName.length > 80) {
    return {
      field: "givenName",
      message: "Enter your given name using no more than 80 characters.",
    };
  }
  if (!usesSingleName && (!familyName || familyName.length > 80)) {
    return {
      field: "familyName",
      message: "Enter your family name, or choose that you use one name.",
    };
  }
  if (usesSingleName && familyName) {
    return {
      field: "familyName",
      message: "Clear the family name before choosing that you use one name.",
    };
  }

  return {
    givenName,
    ...(familyName ? { familyName } : {}),
    usesSingleName,
    displayName: usesSingleName ? givenName : `${givenName} ${familyName}`,
  };
}

export function suggestedHandle(displayName: string): string {
  return displayName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 30)
    .replace(/-+$/gu, "");
}
