import { z } from "zod";

export const MIN_ADMIN_PASSWORD = 12;
export const MAX_ADMIN_PASSWORD = 128;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z
      .string()
      .min(MIN_ADMIN_PASSWORD, `Use at least ${MIN_ADMIN_PASSWORD} characters.`)
      .max(MAX_ADMIN_PASSWORD, `Use at most ${MAX_ADMIN_PASSWORD} characters.`),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "The new passwords don't match.",
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "Choose a password different from the current one.",
  });

export function changePasswordFromFormData(fd: FormData) {
  return {
    currentPassword: String(fd.get("currentPassword") ?? ""),
    newPassword: String(fd.get("newPassword") ?? ""),
    confirmPassword: String(fd.get("confirmPassword") ?? ""),
  };
}
