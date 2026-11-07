import { useMutation } from "@tanstack/react-query";
import {
  contactAPI,
  type ContactPayload,
  type ContactResult,
  type InstitutionPlanPayload,
} from "../endpoints/contact.endpoints";

/**
 * No query-key factory here, unlike the other wrappers: the landing page only
 * ever writes contact messages and never reads them back, so there is nothing
 * to invalidate.
 */
export const useSubmitContact = () =>
  useMutation<ContactResult, Error, ContactPayload>({
    mutationFn: (payload) => contactAPI.submit(payload),
  });

export const useSubmitInstitutionPlan = () =>
  useMutation<ContactResult, Error, InstitutionPlanPayload>({
    mutationFn: (payload) => contactAPI.submitInstitutionPlan(payload),
  });
