/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  useRegister,
  useVerify,
  useSendOtp,
} from "@/api/wrappers/auth.wrappers";
import {
  useAddStore,
  useCheckStoreDomainAvailability,
} from "@/api/wrappers/store.wrappers";
import { useCreateSubscription } from "@/api/wrappers/subscription.wrapper";
import { useFetchAllPlans } from "@/api/wrappers/plan.wrappers";
import { toast } from "sonner";

function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Fetch plans first
  const plans = useFetchAllPlans();
  const plansData = plans.data
    ? Array.isArray(plans.data)
      ? plans.data
      : plans.data?.data || []
    : [];

  // Always start from step 1 (plan selection) unless skipToStep is provided
  // User must select a plan before creating a store
  const initialStep = location.state?.skipToStep || 1;
  const [currentStep, setCurrentStep] = useState(initialStep);
  const { mutate: registerMutation, isPending: isRegistering } = useRegister();
  const { mutate: sendOtpMutation, isPending: isSendingOtp } = useSendOtp();
  const { mutate: verifyOtpMutation, isPending: isVerifyingOtp } = useVerify();
  const { mutate: addStoreMutation } = useAddStore();
  const { mutate: createSubscriptionMutation } = useCreateSubscription();

  // Initialize formData with user info if available - using lazy initialization
  const [formData, setFormData] = useState(() => {
    // Get initial values from location.state
    const initialName = location.state?.userInfo?.name || "";
    const initialEmail = location.state?.userInfo?.email || "";
    const initialPhone = location.state?.userInfo?.phone || "";

    // Handle plan: selectedPlan from location.state
    let initialPlan = location.state?.selectedPlan || null;

    return {
      name: initialName,
      email: initialEmail,
      phone: initialPhone,
      plan: initialPlan,
      otp: "",
      paymentMethod: "card",
      websiteType: "store",
      logo: null as string | null,
      logoFile: null as File | null,
      storeName: "",
      domain: "",
      domainType: "subdomain",
      websiteUrl: "",
      username: "",
      password: "",
    };
  });

  const [otpSent, setOtpSent] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [domainChecked, setDomainChecked] = useState(false);
  const [domainAvailable, setDomainAvailable] = useState<boolean | null>(null);
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);

  // Set default plan if skipToStep is 3 and no plan selected
  useEffect(() => {
    if (
      location.state?.skipToStep === 3 &&
      !formData.plan &&
      plansData.length > 0
    ) {
      const defaultPlan = plansData.find((plan: any) => plan.name === "Go");
      if (defaultPlan) {
        setFormData((prev) => ({ ...prev, plan: defaultPlan }));
      }
    }
  }, [plansData, location.state?.skipToStep]);

  // If user is logged in and on step 2, send OTP automatically
  useEffect(() => {
    if (user && currentStep === 2 && !otpSent) {
      // Get phone from user data or location state
      const phone =
        (user as any)?.phone || (user as any)?.user?.phone || formData.phone;
      if (phone) {
        sendOtpMutation(
          { phone },
          {
            onSuccess: () => {
              setOtpSent(true);
              setFormData((prev) => ({ ...prev, phone }));
            },
            onError: (error) => {
              console.error("Error sending OTP:", error);
            },
          }
        );
      }
    }
  }, [user, currentStep, otpSent, sendOtpMutation, formData.phone]);

  const steps = [
    { number: 1, title: "المعلومات", icon: "👤" },
    { number: 2, title: "التحقق من OTP", icon: "🔐" },
    { number: 3, title: "اختيار الخطة", icon: "📦" },
    { number: 4, title: "الدفع", icon: "💳" },
    { number: 5, title: "تخصيص الموقع", icon: "⚙️" },
  ];

  const checkDomainAvailabilityMutation = useCheckStoreDomainAvailability();

  // Show loading or error states
  if (plans.isLoading) return <div>Loading...</div>;
  if (plans.isError) return <div>Error: {plans.error.message}</div>;
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Reset domain check when domain changes
    if (e.target.name === "domain" || e.target.name === "domainType") {
      setDomainChecked(false);
      setDomainAvailable(null);
    }
  };

  const handlePlanSelect = (plan: any) => {
    setFormData({ ...formData, plan });
  };

  const handleCheckDomainAvailability = () => {
    if (!formData.domain) {
      toast.error("الرجاء إدخال الدومين أولاً");
      return;
    }

    setIsCheckingDomain(true);
    setDomainChecked(false);

    // Prepare domain based on type
    const fullDomain =
      formData.domainType === "subdomain"
        ? `${formData.domain}.mel.iq`
        : formData.domain;

    // Send domain with type to API
    checkDomainAvailabilityMutation.mutate(
      {
        domain: fullDomain,
        domainType: formData.domainType, // Send domain type to distinguish between subdomain and custom
      },
      {
        onSuccess: (data: any) => {
          setIsCheckingDomain(false);
          setDomainChecked(true);
          // API returns { isAvailable: true/false }
          const available =
            data?.isAvailable ?? data?.data?.isAvailable ?? false;
          setDomainAvailable(available);

          if (available) {
            toast.success("الدومين متاح! يمكنك المتابعة.");
          } else {
            toast.error("الدومين غير متاح. الرجاء اختيار دومين آخر.");
          }
        },
        onError: (error: any) => {
          setIsCheckingDomain(false);
          setDomainChecked(false);
          console.error("Error checking domain:", error);
          // Try to extract error message
          const errorMessage =
            error?.response?.data?.message ||
            error?.message ||
            "حدث خطأ في التحقق من الدومين";
          toast.error(errorMessage);
        },
      }
    );
  };

  const handleStep1Submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // If user is logged in, just proceed to OTP step
    if (user) {
      // Send OTP for logged in user
      const phone =
        (user as any)?.phone || (user as any)?.user?.phone || formData.phone;
      if (phone) {
        sendOtpMutation(
          { phone },
          {
            onSuccess: () => {
              setOtpSent(true);
              setCurrentStep(2);
            },
            onError: (error) => {
              toast.error(
                "حدث خطأ في إرسال رمز OTP. الرجاء المحاولة مرة أخرى."
              );
              console.error("Error sending OTP:", error);
            },
          }
        );
      } else {
        toast.error("الرجاء إدخال رقم الهاتف");
      }
    } else {
      // If user is not logged in, register and send OTP
      if (formData.name && formData.email && formData.phone) {
        registerMutation(
          {
            phone: formData.phone,
            name: formData.name,
            email: formData.email,
          },
          {
            onSuccess: () => {
              setOtpSent(true);
              setCurrentStep(2);
            },
            onError: (error) => {
              toast.error(
                "حدث خطأ في التسجيل وإرسال رمز OTP. الرجاء المحاولة مرة أخرى."
              );
              console.error("Error registering:", error);
            },
          }
        );
      } else {
        toast.error("الرجاء إدخال جميع المعلومات المطلوبة");
      }
    }
  };

  const handleOTPVerify = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.otp && formData.otp.length === 4) {
      // Get phone from user data or formData
      const phone =
        (user as any)?.phone || (user as any)?.user?.phone || formData.phone;
      // Verify OTP - send phone and code
      verifyOtpMutation(
        {
          phone,
          code: formData.otp,
        },
        {
          onSuccess: () => {
            // Generate credentials
            const username = `user_${Math.random().toString(36).substr(2, 9)}`;
            const password = Math.random().toString(36).substr(2, 12);
            const planId =
              formData.plan?.id ||
              formData.plan?.name?.toLowerCase() ||
              "basic";
            const websiteUrl = `https://${planId}.mel.iq/${username}`;

            setFormData({
              ...formData,
              username,
              password,
              websiteUrl,
            });
            // Go to plan selection step after OTP verification
            setCurrentStep(3);
          },
          onError: (error) => {
            toast.error("رمز OTP غير صحيح. الرجاء المحاولة مرة أخرى.");
            console.error("Error verifying OTP:", error);
          },
        }
      );
    } else {
      toast.error("الرجاء إدخال رمز OTP صحيح (4 أرقام)");
    }
  };

  const handlePlanSelection = () => {
    // Check if plan is selected
    if (!formData.plan || !formData.plan.id) {
      toast.error("الرجاء اختيار خطة قبل المتابعة");
      return;
    }
    // Proceed to payment step
    setCurrentStep(4);
  };

  const handlePayment = () => {
    // Check if plan is selected before payment
    if (!formData.plan || !formData.plan.id) {
      toast.error("الرجاء اختيار خطة قبل الدفع");
      setCurrentStep(3);
      return;
    }
    // Simulate payment processing
    setPaymentCompleted(true);
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setCurrentStep(5);
    }, 3000); // Give time for processing
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview URL for display
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          logo: reader.result as string,
          logoFile: file,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleWebsiteCustomization = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const data = new FormData();

    // Check if plan is selected - required before creating store
    if (!formData.plan || !formData.plan.id) {
      toast.error("الرجاء اختيار خطة قبل إنشاء المتجر");
      setCurrentStep(1); // Go back to plan selection
      return;
    }

    // Check if domain is available before proceeding
    if (!domainChecked) {
      toast.error("الرجاء التحقق من توفر الدومين أولاً");
      return;
    }

    if (domainAvailable === false || domainAvailable === null) {
      toast.error("الدومين غير متاح. الرجاء اختيار دومين آخر والتحقق منه.");
      return;
    }

    if (formData.logo) {
      data.append("logo", formData.logo);
    }

    if (formData.websiteType && formData.domain) {
      // Generate final website URL based on domain choice
      let finalUrl = "";
      if (formData.domainType === "subdomain") {
        finalUrl = `https://${formData.domain}.mel.iq`;
      } else {
        finalUrl = `https://${formData.domain}`;
      }

      const updatedFormData = {
        ...formData,
        websiteUrl: finalUrl,
      };

      setFormData(updatedFormData);

      // Save store to user account if logged in
      if (user) {
        // Create FormData for file upload
        const storeFormData = new FormData();
        storeFormData.append("name", formData.storeName || formData.domain);
        storeFormData.append(
          "type",
          formData.websiteType === "store" ? "ECOMMERCE" : "RESTAURANT"
        );
        storeFormData.append("domain", finalUrl);
        if (formData.logoFile) {
          storeFormData.append("logo", formData.logoFile);
        }
        storeFormData.append("createdAt", new Date().toISOString());

        console.log(storeFormData.get("logo"));
        console.log(storeFormData.get("name"));
        console.log(storeFormData.get("type"));
        console.log(storeFormData.get("domain"));
        console.log(storeFormData.get("createdAt"));

        addStoreMutation(storeFormData, {
          onSuccess: (storeData: any) => {
            // After successful store creation, create subscription
            const storeId =
              storeData?.id || storeData?.data?.id || storeData?.store?.id;
            // Get planId - could be uuid, id, or planId property
            const planId =
              formData.plan?.uuid ||
              formData.plan?.planId ||
              formData.plan?.id ||
              null;

            if (storeId && planId && formData.plan) {
              // Calculate subscription dates (1 year from now)
              const startAt = new Date().toISOString();
              const endAt = new Date();
              endAt.setFullYear(endAt.getFullYear() + 1);
              const endAtISO = endAt.toISOString();

              createSubscriptionMutation(
                {
                  storeId,
                  planId,
                  start_at: startAt,
                  end_at: endAtISO,
                  status: "ACTIVE",
                },
                {
                  onSuccess: () => {
                    // Navigate to templates page after successful subscription creation
                    navigate("/templates", {
                      state: {
                        websiteType: formData.websiteType,
                        domain: formData.domain,
                        url: finalUrl,
                      },
                    });
                  },
                  onError: (error) => {
                    console.error("Error creating subscription:", error);
                    toast.warning(
                      "تم إنشاء المتجر بنجاح، لكن حدث خطأ في إنشاء الاشتراك. الرجاء المحاولة مرة أخرى."
                    );
                    // Still navigate even if subscription creation fails
                    navigate("/templates", {
                      state: {
                        websiteType: formData.websiteType,
                        domain: formData.domain,
                        url: finalUrl,
                      },
                    });
                  },
                }
              );
            } else {
              // If storeId or planId is missing, show error and don't navigate
              console.error(
                "Missing storeId or planId, cannot create subscription",
                {
                  storeId,
                  planId,
                  plan: formData.plan,
                }
              );
              toast.error(
                "حدث خطأ: لم يتم العثور على معرف المتجر أو الخطة. الرجاء المحاولة مرة أخرى."
              );
              // Don't navigate - user should stay on the page
            }
          },
          onError: (error) => {
            console.error("Error creating store:", error);
            toast.error("حدث خطأ في إنشاء المتجر. الرجاء المحاولة مرة أخرى.");
          },
        });
      } else {
        // Navigate to templates page if user is not logged in
        navigate("/templates", {
          state: {
            websiteType: formData.websiteType,
            domain: formData.domain,
            url: finalUrl,
          },
        });
      }
    }
  };

  const resendOTP = () => {
    // Get phone from user data or formData
    const phone =
      (user as any)?.phone || (user as any)?.user?.phone || formData.phone;
    sendOtpMutation(
      { phone },
      {
        onSuccess: () => {
          toast.success("تم إرسال رمز OTP جديد إلى رقمك");
        },
        onError: (error) => {
          toast.error("حدث خطأ في إرسال رمز OTP. الرجاء المحاولة مرة أخرى.");
          console.error("Error resending OTP:", error);
        },
      }
    );
  };

  return (
    <div className="w-full min-h-screen py-20 bg-white dark:bg-black">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Steps Indicator - Only show if not skipping */}
        {!location.state?.skipToStep && (
          <div className="mb-12">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold transition-all border-2 ${
                        currentStep >= step.number
                          ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white"
                          : "bg-white dark:bg-black text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-800"
                      }`}
                    >
                      {step.number <= currentStep ? step.icon : step.number}
                    </div>
                    <span
                      className={`mt-2 text-sm font-medium text-center ${
                        currentStep >= step.number
                          ? "text-black dark:text-white"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        currentStep > step.number
                          ? "bg-black dark:bg-white"
                          : "bg-gray-200 dark:bg-gray-800"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white dark:bg-black rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-8 md:p-12">
          {/* Step 1: User Info - Only for non-logged in users */}
          {currentStep === 1 && !location.state?.skipToStep && (
            <div>
              <h2 className="text-3xl font-bold text-black dark:text-gray-400 mb-6 text-center">
                {user ? "المتابعة إلى التحقق" : "أدخل معلوماتك"}
              </h2>
              {user ? (
                <div className="text-center">
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    مرحباً بك! سيتم إرسال رمز OTP إلى رقمك المسجل
                  </p>
                  <button
                    onClick={() => {
                      const phone =
                        (user as any)?.phone ||
                        (user as any)?.user?.phone ||
                        formData.phone;
                      if (phone) {
                        sendOtpMutation(
                          { phone },
                          {
                            onSuccess: () => {
                              setOtpSent(true);
                              setCurrentStep(2);
                            },
                            onError: (error) => {
                              toast.error(
                                "حدث خطأ في إرسال رمز OTP. الرجاء المحاولة مرة أخرى."
                              );
                              console.error("Error sending OTP:", error);
                            },
                          }
                        );
                      }
                    }}
                    disabled={isSendingOtp}
                    className="w-full bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white py-3 px-6 rounded-lg font-semibold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSendingOtp ? "جاري الإرسال..." : "المتابعة إلى التحقق"}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleStep1Submit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                        الاسم الكامل
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-black dark:text-white rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white500 focus:border-transparent outline-none transition"
                        placeholder="أدخل اسمك الكامل"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                        البريد الإلكتروني
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-black dark:text-white rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white500 focus:border-transparent outline-none transition"
                        placeholder="example@email.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                      رقم الجوال (واتساب)
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-black dark:text-white rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white500 focus:border-transparent outline-none transition"
                      placeholder="+966xxxxxxxxx"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isRegistering}
                    className="w-full bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white py-3 px-6 rounded-lg font-semibold text-lg transition-colors mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRegistering ? "جاري التسجيل..." : "المتابعة إلى التحقق"}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Step 3: Plan Selection */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-3xl font-bold text-black dark:text-white mb-6 text-center">
                اختر خطتك
              </h2>
              <div className="space-y-6">
                {!formData.plan && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {plansData.map((plan: any) => (
                      <div
                        key={plan.id}
                        onClick={() => handlePlanSelect(plan)}
                        className={`cursor-pointer p-4 rounded-lg border-2 transition-colors ${
                          formData.plan?.id === plan.id
                            ? "border-black dark:border-white bg-gray-100 dark:bg-gray-900"
                            : "border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600"
                        }`}
                      >
                        <h4 className="text-lg font-bold text-black dark:text-white mb-2">
                          {plan.name || ""}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          {plan.description || ""}
                        </p>
                        <p className="text-2xl font-bold text-black dark:text-white mb-4">
                          {plan.monthly_price
                            ? plan.monthly_price.toLocaleString("en-IQ")
                            : "0"}{" "}
                          د.ع
                        </p>
                        <ul className="space-y-2">
                          {plan.features
                            .filter((feature: any) => feature.enabled !== false)
                            .map((feature: any, idx: number) => (
                              <li
                                key={idx}
                                className="flex items-center text-sm text-gray-700 dark:text-gray-400"
                              >
                                <svg
                                  className="w-4 h-4 text-black dark:text-white mr-2"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                {feature.name || ""}
                              </li>
                            ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
                {formData.plan && (
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 border-2 border-slate-900 dark:border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                          الخطة المختارة
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {formData.plan.name || ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                          {formData.plan.monthly_price
                            ? formData.plan.monthly_price.toLocaleString(
                                "en-IQ"
                              )
                            : "0"}{" "}
                          <span className="text-lg font-normal text-slate-600 dark:text-slate-400">
                            د.ع
                          </span>
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500">
                          شهرياً
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handlePlanSelection}
                      disabled={!formData.plan}
                      className="w-full bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 hover:from-slate-800 hover:to-slate-600 dark:hover:from-slate-200 dark:hover:to-slate-400 text-white dark:text-slate-900 py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      المتابعة إلى الدفع
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2 text-center bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                الدفع
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-center mb-10 text-sm sm:text-base">
                أكمل عملية الدفع للمتابعة
              </p>
              {processing ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-slate-900 dark:border-slate-700 dark:border-t-slate-100 mx-auto mb-4"></div>
                  <p className="text-slate-600 dark:text-slate-400 font-medium">
                    جاري معالجة الدفع...
                  </p>
                </div>
              ) : (
                <div className="max-w-md mx-auto">
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-8 border-2 border-slate-200 dark:border-slate-700 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-slate-600 dark:text-slate-400">
                        الخطة:
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-xl">
                        {formData.plan?.name || ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-slate-600 dark:text-slate-400">
                        المبلغ:
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-xl">
                        {formData.plan?.monthly_price
                          ? formData.plan.monthly_price.toLocaleString("en-IQ")
                          : "0"}{" "}
                        د.ع /شهرياً
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handlePayment}
                    disabled={!formData.plan}
                    className="w-full bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 hover:from-slate-800 hover:to-slate-600 dark:hover:from-slate-200 dark:hover:to-slate-400 text-white dark:text-slate-900 py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    {paymentCompleted
                      ? "تم الدفع بنجاح"
                      : `دفع ${
                          formData.plan?.monthly_price
                            ? formData.plan.monthly_price.toLocaleString(
                                "en-IQ"
                              )
                            : "0"
                        } د.ع /شهرياً`}
                  </button>
                </div>
              )}
            </div>
          )}

          {currentStep === 5 && (
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2 text-center bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                تخصيص موقعك
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-center mb-10 text-sm sm:text-base">
                قم بتخصيص موقعك الإلكتروني
              </p>
              <form
                onSubmit={handleWebsiteCustomization}
                className="max-w-2xl mx-auto space-y-6"
              >
                {/* Store Name */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    اسم المتجر
                  </label>
                  <input
                    type="text"
                    name="storeName"
                    value={formData.storeName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-300 focus:border-transparent outline-none transition-all duration-300 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    placeholder="أدخل اسم المتجر"
                  />
                </div>

                {/* Website Type */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                    نوع الموقع
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <label
                      className={`p-6 border-2 rounded-xl cursor-pointer transition-all duration-300 ${
                        formData.websiteType === "store"
                          ? "border-slate-900 dark:border-slate-100 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 shadow-xl"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-white dark:bg-slate-800"
                      }`}
                    >
                      <input
                        type="radio"
                        name="websiteType"
                        value="store"
                        checked={formData.websiteType === "store"}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <div className="text-4xl mb-3">🛍️</div>
                        <span className="text-lg font-semibold text-slate-900 dark:text-slate-100 block mb-2">
                          متجر إلكتروني
                        </span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          لبيع المنتجات
                        </span>
                      </div>
                    </label>
                    <label
                      className={`p-6 border-2 rounded-xl cursor-pointer transition-all duration-300 ${
                        formData.websiteType === "restaurant"
                          ? "border-slate-900 dark:border-slate-100 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 shadow-xl"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-white dark:bg-slate-800"
                      }`}
                    >
                      <input
                        type="radio"
                        name="websiteType"
                        value="restaurant"
                        checked={formData.websiteType === "restaurant"}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <div className="text-4xl mb-3">🍽️</div>
                        <span className="text-lg font-semibold text-slate-900 dark:text-slate-100 block mb-2">
                          منيو مطعم
                        </span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          لعرض قوائم الطعام
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    رفع الشعار (اختياري)
                  </label>
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center hover:border-slate-500 dark:hover:border-slate-400 transition-colors">
                    {formData.logo ? (
                      <div className="space-y-4">
                        <img
                          src={formData.logo as string}
                          alt="Logo preview"
                          className="max-w-32 max-h-32 mx-auto rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              logo: null,
                              logoFile: null,
                            })
                          }
                          className="text-red-600 dark:text-red-400 hover:underline text-sm"
                        >
                          إزالة الشعار
                        </button>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                          id="logo-upload"
                        />
                        <label
                          htmlFor="logo-upload"
                          className="cursor-pointer flex flex-col items-center"
                        >
                          <svg
                            className="w-12 h-12 text-slate-400 mb-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <span className="text-slate-600 dark:text-slate-400">
                            اضغط لرفع الشعار
                          </span>
                          <span className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                            PNG, JPG أو SVG
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Domain Selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                    نوع الدومين
                  </label>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <label
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-300 ${
                        formData.domainType === "subdomain"
                          ? "border-slate-900 dark:border-slate-100 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-white dark:bg-slate-800"
                      }`}
                    >
                      <input
                        type="radio"
                        name="domainType"
                        value="subdomain"
                        checked={formData.domainType === "subdomain"}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                          دومين فرعي
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          example.mel.iq
                        </div>
                      </div>
                    </label>
                    <label
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-300 ${
                        formData.domainType === "custom"
                          ? "border-slate-900 dark:border-slate-100 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-white dark:bg-slate-800"
                      }`}
                    >
                      <input
                        type="radio"
                        name="domainType"
                        value="custom"
                        checked={formData.domainType === "custom"}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                          دومين مخصص
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          example.com
                        </div>
                      </div>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      {formData.domainType === "subdomain"
                        ? "اسم الدومين الفرعي"
                        : "الدومين المخصص"}
                    </label>
                    <div className="flex">
                      {formData.domainType === "subdomain" ? (
                        <>
                          <span
                            dir="ltr"
                            className="px-4 py-3 bg-slate-100 right-0 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-2 border-l-0 border-slate-200 dark:border-slate-700 rounded-r-xl"
                          >
                            .mel.iq
                          </span>
                          <input
                            type="text"
                            name="domain"
                            value={formData.domain}
                            onChange={handleInputChange}
                            required
                            className="flex-1 px-4 py-3 border-2 border-r-0 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-l-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-300 focus:border-transparent outline-none transition-all duration-300 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            placeholder="example"
                          />
                        </>
                      ) : (
                        <input
                          type="text"
                          name="domain"
                          value={formData.domain}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-300 focus:border-transparent outline-none transition-all duration-300 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                          placeholder="example.com"
                        />
                      )}
                    </div>
                  </div>
                  {/* Domain Availability Check */}
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={handleCheckDomainAvailability}
                      disabled={!formData.domain || isCheckingDomain}
                      className="w-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 py-2 px-4 rounded-lg font-medium text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCheckingDomain ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-600 border-t-transparent"></div>
                          جاري التحقق...
                        </span>
                      ) : (
                        "التحقق من توفر الدومين"
                      )}
                    </button>
                  
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!domainChecked || domainAvailable === false}
                  className="w-full bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 hover:from-slate-800 hover:to-slate-600 dark:hover:from-slate-200 dark:hover:to-slate-400 text-white dark:text-slate-900 py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  المتابعة إلى القوالب
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Checkout;
