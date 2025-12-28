export type Role = "superadmin" | "admin";

export const PERMISSIONS = {
  superadmin: {
    manageAdmins: true,
    deleteAgreements: true,
    deleteCars: true,
  },
  admin: {
    manageAdmins: false,
    deleteAgreements: false,
    deleteCars: false,
  },
} as const;
