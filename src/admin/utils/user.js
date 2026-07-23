function hashString(value) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36).toUpperCase();
}

function toSixDigitId(value) {
  const normalized = String(value || "").replace(/\D/g, "");

  if (normalized.length === 6) {
    return normalized;
  }

  const numeric = Number.parseInt(hashString(String(value || "")), 36);
  const safeNumber = Number.isFinite(numeric) ? Math.abs(numeric) : 0;
  return String(100000 + (safeNumber % 900000));
}

export function buildUserId(user, index = 0) {
  const rawId =
    user?._id ||
    user?.id ||
    user?.userId ||
    user?.customerId ||
    user?.uid ||
    "";

  if (rawId) {
    return toSixDigitId(rawId);
  }

  const seed = [
    user?.name,
    user?.fullName,
    user?.email,
    user?.phone,
    user?.mobile,
    user?.createdAt,
    index + 1,
  ]
    .filter(Boolean)
    .join("|");

  return toSixDigitId(seed || String(index + 1));
}

export function normalizeUserRecord(user, index = 0) {
  const rawId =
    user?._id ||
    user?.id ||
    user?.userId ||
    user?.customerId ||
    user?.uid ||
    "";
  const userId = buildUserId(user, index);
  const password =
    user?.password ||
    user?.passcode ||
    user?.passwordHash ||
    user?.hashedPassword ||
    user?.encryptedPassword ||
    user?.pwd ||
    user?.secret ||
    "";
  const isBlocked = Boolean(
    user?.isBlocked || user?.blocked || user?.active === false
  );
  const isActive = isBlocked
    ? false
    : user?.isActive !== undefined
    ? Boolean(user.isActive)
    : true;
  const isVerified = Boolean(
    user?.otpVerified ||
      user?.verified ||
      user?.isVerified ||
      user?.emailVerified ||
      user?.status === "verified"
  );

  return {
    id: rawId || userId,
    rawId: rawId ? String(rawId) : "",
    userId,
    name: user?.name || user?.fullName || user?.userName || "N/A",
    email: user?.email || "N/A",
    phone: user?.phone || user?.mobile || "N/A",
    address: user?.address || user?.location || user?.city || "N/A",
    password: password || "N/A",
    verificationStatus: isVerified ? "verified" : "unverified",
    accountStatus: isBlocked ? "blocked" : isActive ? "active" : "inactive",
    status:
      user?.status ||
      user?.accountStatus ||
      (isBlocked ? "blocked" : isVerified ? "verified" : "unverified"),
    isActive,
    isVerified,
    isBlocked,
    walletBalance:
      typeof user?.walletBalance === "number"
        ? user.walletBalance
        : Number(user?.walletBalance || 0),
    joined: user?.joined || user?.createdAt || user?.date || "N/A",
  };
}
