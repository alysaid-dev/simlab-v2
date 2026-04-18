import { DocumentType } from "@prisma/client";
import { prisma } from "../config/database.js";

interface VerifyResult {
  valid: boolean;
  documentType?: DocumentType;
  documentId?: string;
  signerName?: string;
  signerRole?: string;
  laboratoryName?: string | null;
  signedAt?: Date;
  studentName?: string | null;
  studentNim?: string | null;
}

/**
 * Resolve the human-friendly role label for a signer. A user may hold
 * multiple roles; we prefer kepala-lab → laboran → the first role name.
 */
function deriveSignerRole(
  roleNames: string[],
  hasKepalaLabLink: boolean,
  hasLaboranLink: boolean,
): string {
  if (roleNames.includes("KEPALA_LAB") || hasKepalaLabLink) {
    return "Kepala Laboratorium";
  }
  if (roleNames.includes("LABORAN") || hasLaboranLink) return "Laboran";
  if (roleNames.length > 0) return roleNames[0];
  return "Penandatangan";
}

export const verifyService = {
  async verify(hash: string): Promise<VerifyResult> {
    const sig = await prisma.digitalSignature.findUnique({
      where: { hash },
      include: {
        signer: {
          include: {
            roles: { include: { role: true } },
            kepalaOfLabs: { select: { id: true, name: true } },
            laboranOfLabs: {
              include: { laboratory: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });
    if (!sig) return { valid: false };

    // Resolve document owner (student). The sig.documentId points to one of
    // several models depending on documentType.
    let studentName: string | null = null;
    let studentNim: string | null = null;

    if (sig.documentType === DocumentType.CLEARANCE_LETTER) {
      const letter = await prisma.clearanceLetter.findUnique({
        where: { id: sig.documentId },
        include: { user: { select: { displayName: true, uid: true } } },
      });
      if (letter) {
        studentName = letter.user.displayName;
        studentNim = letter.user.uid;
      }
    } else if (sig.documentType === DocumentType.LOAN_AGREEMENT) {
      const loan = await prisma.loan.findUnique({
        where: { id: sig.documentId },
        include: {
          borrower: { select: { displayName: true, uid: true } },
        },
      });
      if (loan) {
        studentName = loan.borrower.displayName;
        studentNim = loan.borrower.uid;
      }
    } else if (sig.documentType === DocumentType.EQUIPMENT_LOAN) {
      const loan = await prisma.equipmentLoan.findUnique({
        where: { id: sig.documentId },
        include: { user: { select: { displayName: true, uid: true } } },
      });
      if (loan) {
        studentName = loan.user.displayName;
        studentNim = loan.user.uid;
      }
    }

    const roleNames = sig.signer.roles.map((r) => r.role.name);
    const signerRole = deriveSignerRole(
      roleNames,
      sig.signer.kepalaOfLabs.length > 0,
      sig.signer.laboranOfLabs.length > 0,
    );

    const laboratoryName =
      sig.signer.kepalaOfLabs[0]?.name ??
      sig.signer.laboranOfLabs[0]?.laboratory.name ??
      null;

    return {
      valid: true,
      documentType: sig.documentType,
      documentId: sig.documentId,
      signerName: sig.signer.displayName,
      signerRole,
      laboratoryName,
      signedAt: sig.createdAt,
      studentName,
      studentNim,
    };
  },
};
