import axiosInstance from "@/utils/AxiosInstance";

export type ContactPayload = {
  name: string;
  email: string;
  /** Optional. E.164 when present — the admin dashboard builds a wa.me link from it. */
  phone?: string;
  subject: string;
  message: string;
  /** Honeypot. Always sent, always empty for a human. */
  lpReference?: string;
};

export type ContactResult = {
  ok: boolean;
  message: string;
};

/**
 * The public contact form. Unauthenticated on the server — it lands as a
 * support ticket tagged `source: LANDING_PAGE`, in the same queue the team
 * already works.
 */
export const contactAPI = {
  submit: async (payload: ContactPayload): Promise<ContactResult> => {
    const { data } = await axiosInstance.post<ContactResult>(
      "/support-ticket/public/contact",
      payload,
    );
    return data;
  },
};

export default contactAPI;
