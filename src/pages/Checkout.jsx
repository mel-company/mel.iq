/* eslint-disable no-unused-vars */
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function Checkout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, addStore } = useAuth()
  const [currentStep, setCurrentStep] = useState(
    location.state?.skipToStep || 1
  )

  // Initialize formData with user info if available - using lazy initialization
  const [formData, setFormData] = useState(() => {
    const defaultPlan = {
      id: 'professional',
      name: 'Professional',
      price: 29.99,
      description: 'Best for growing businesses',
      features: ['100GB Storage', 'Priority Support', 'Unlimited Templates']
    }

    // Get initial values from location.state (priority) or user
    // location.state takes precedence if provided
    const initialName = location.state?.userInfo?.name || user?.name || ''
    const initialEmail = location.state?.userInfo?.email || user?.email || ''
    const initialPhone = location.state?.userInfo?.phone || user?.phone || ''

    // Handle plan: selectedPlan from location.state, or defaultPlan if skipToStep is 3, or null
    let initialPlan = location.state?.selectedPlan || null
    if (!initialPlan && location.state?.skipToStep === 3) {
      initialPlan = defaultPlan
    }

    return {
      name: initialName,
      email: initialEmail,
      phone: initialPhone,
      plan: initialPlan,
      otp: '',
      paymentMethod: 'card',
      websiteType: 'store',
      logo: null,
      domain: '',
      domainType: 'subdomain',
      websiteUrl: '',
      username: '',
      password: ''
    }
  })

  const [otpSent, setOtpSent] = useState(false)
  const [paymentCompleted, setPaymentCompleted] = useState(false)
  const [processing, setProcessing] = useState(false)

  // Convert pricing page plan format to checkout format if needed
  // This is handled in the initial state, so we don't need a useEffect here

  const steps = [
    { number: 1, title: 'المعلومات والخطة', icon: '👤' },
    { number: 2, title: 'التحقق من OTP', icon: '🔐' },
    { number: 3, title: 'الدفع', icon: '💳' },
    { number: 4, title: 'تخصيص الموقع', icon: '⚙️' }
  ]

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: 9.99,
      description: 'Perfect for individuals',
      features: ['10GB Storage', 'Basic Support', '5 Templates']
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 29.99,
      description: 'Best for growing businesses',
      features: ['100GB Storage', 'Priority Support', 'Unlimited Templates'],
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 99.99,
      description: 'For large organizations',
      features: ['1TB Storage', 'Dedicated Support', 'Custom Templates']
    }
  ]

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handlePlanSelect = (plan) => {
    setFormData({ ...formData, plan })
  }

  const handleStep1Submit = (e) => {
    e.preventDefault()
    if (formData.name && formData.email && formData.phone && formData.plan) {
      // Simulate sending OTP
      setOtpSent(true)
      setCurrentStep(2)
      // In production, send OTP to phone
      console.log('OTP sent to:', formData.phone)
    }
  }

  const handleOTPVerify = (e) => {
    e.preventDefault()
    if (formData.otp && formData.otp.length === 6) {
      // Generate credentials
      const username = `user_${Math.random().toString(36).substr(2, 9)}`
      const password = Math.random().toString(36).substr(2, 12)
      const planId = formData.plan?.id || formData.plan?.name?.toLowerCase() || 'basic'
      const websiteUrl = `https://${planId}.mel.iq/${username}`

      setFormData({
        ...formData,
        username,
        password,
        websiteUrl
      })
      setCurrentStep(3)
    } else {
      alert('الرجاء إدخال رمز OTP صحيح (6 أرقام)')
    }
  }

  const handlePayment = () => {
    // Simulate payment processing
    setPaymentCompleted(true)
    setProcessing(true)
    setTimeout(() => {
      setProcessing(false)
      setCurrentStep(4)
    }, 3000) // Give time for processing
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData({ ...formData, logo: reader.result })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleWebsiteCustomization = (e) => {
    e.preventDefault()
    if (formData.websiteType && formData.domain) {
      // Generate final website URL based on domain choice
      let finalUrl = ''
      if (formData.domainType === 'subdomain') {
        finalUrl = `https://${formData.domain}.mel.iq`
      } else {
        finalUrl = `https://${formData.domain}`
      }

      const updatedFormData = {
        ...formData,
        websiteUrl: finalUrl
      }

      setFormData(updatedFormData)

      // Save store to user account if logged in
      if (user) {
        addStore({
          name: formData.domain,
          type: formData.websiteType,
          url: finalUrl,
          logo: formData.logo,
          createdAt: new Date().toISOString()
        })
      }

      // Navigate to templates page
      navigate('/templates', {
        state: {
          websiteType: formData.websiteType,
          domain: formData.domain,
          url: finalUrl
        }
      })
    }
  }

  const generateOTP = () => {
    // Simulate OTP generation
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    console.log('Generated OTP:', otp)
    // In production, send this via SMS
    return otp
  }

  const resendOTP = () => {
    generateOTP()
    alert('تم إرسال رمز OTP جديد إلى رقمك')
  }

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
                      className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold transition-all border-2 ${currentStep >= step.number
                        ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                        : 'bg-white dark:bg-black text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-800'
                        }`}
                    >
                      {step.number <= currentStep ? step.icon : step.number}
                    </div>
                    <span className={`mt-2 text-sm font-medium text-center ${currentStep >= step.number ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 ${currentStep > step.number ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-gray-800'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white dark:bg-black rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-8 md:p-12">
          {/* Step 1: User Info and Plan Selection - Only show if not logged in */}
          {currentStep === 1 && !location.state?.skipToStep && (
            <div>
              <h2 className="text-3xl font-bold text-black dark:text-white mb-6 text-center">
                أدخل معلوماتك واختر الخطة
              </h2>
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

                {/* Plan Selection */}
                {!formData.plan && (
                  <div className="mt-8">
                    <h3 className="text-xl font-semibold text-black dark:text-white mb-4">
                      اختر خطتك
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {plans.map((plan) => (
                        <div
                          key={plan.id}
                          onClick={() => handlePlanSelect(plan)}
                          className={`cursor-pointer p-4 rounded-lg border-2 transition-colors ${formData.plan?.id === plan.id
                            ? 'border-black dark:border-white bg-gray-100 dark:bg-gray-900'
                            : 'border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600'
                            }`}
                        >
                          <h4 className="text-lg font-bold text-black dark:text-white mb-2">
                            {plan.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            {plan.description}
                          </p>
                          <p className="text-2xl font-bold text-black dark:text-white mb-4">
                            ${plan.price}
                          </p>
                          <ul className="space-y-2">
                            {plan.features.map((feature, idx) => (
                              <li key={idx} className="flex items-center text-sm text-gray-700 dark:text-gray-400">
                                <svg className="w-4 h-4 text-black dark:text-white mr-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Plan Display */}
                {formData.plan && (
                  <div className="mt-8 p-6 bg-gray-100 dark:bg-gray-900 rounded-xl border-2 border-gray-200 dark:border-gray-800">
                    <h3 className="text-xl font-semibold text-black dark:text-white mb-4">
                      الخطة المختارة
                    </h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-bold text-black dark:text-white">
                          {formData.plan.name}
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400">
                          {formData.plan.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-extrabold text-black dark:text-white">
                          ${formData.plan.price}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setFormData({ ...formData, plan: null })}
                      className="mt-4 text-sm text-black dark:text-white hover:underline"
                    >
                      تغيير الخطة
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white py-3 px-6 rounded-lg font-semibold text-lg transition-colors mt-6"
                >
                  المتابعة إلى التحقق
                </button>
              </form>
            </div>
          )}

          {/* Step 2: OTP Verification */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-3xl font-bold text-black dark:text-white mb-6 text-center">
                التحقق من رقم الجوال
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
                تم إرسال رمز OTP إلى رقم {formData.phone}
              </p>
              <form onSubmit={handleOTPVerify} className="max-w-md mx-auto">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2 text-center">
                    أدخل رمز OTP (6 أرقام)
                  </label>
                  <input
                    type="text"
                    name="otp"
                    value={formData.otp}
                    onChange={handleInputChange}
                    maxLength={6}
                    required
                    className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-black dark:text-white rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white500 focus:border-transparent outline-none transition text-center text-2xl tracking-widest"
                    placeholder="000000"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white py-3 px-6 rounded-lg font-semibold text-lg transition-colors mb-4"
                >
                  التحقق
                </button>
                <button
                  type="button"
                  onClick={resendOTP}
                  className="w-full text-black dark:text-white hover:underline text-sm"
                >
                  إعادة إرسال الرمز
                </button>
              </form>
            </div>
          )}

          {/* Step 3: Payment */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-3xl font-bold text-black dark:text-white mb-6 text-center">
                إتمام الدفع
              </h2>
              <div className="max-w-2xl mx-auto">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 mb-6 border border-gray-200 dark:border-gray-800">
                  <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
                    ملخص الطلب
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">الخطة:</span>
                      <span className="font-semibold text-black dark:text-white">{formData.plan?.name || 'Professional'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">المبلغ:</span>
                      <span className="font-bold text-black dark:text-white text-xl">
                        ${typeof formData.plan?.price === 'string' ? formData.plan.price.replace('$', '') : formData.plan?.price || '29.99'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-4">
                    طريقة الدفع
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.paymentMethod === 'card'
                      ? 'border-black dark:border-white bg-gray-100 dark:bg-gray-900'
                      : 'border-gray-200 dark:border-gray-800'
                      }`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="card"
                        checked={formData.paymentMethod === 'card'}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <div className="text-2xl mb-2">💳</div>
                        <span className="text-sm font-medium text-black dark:text-white">بطاقة ائتمانية</span>
                      </div>
                    </label>
                    <label className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.paymentMethod === 'apple'
                      ? 'border-black dark:border-white bg-gray-100 dark:bg-gray-900'
                      : 'border-gray-200 dark:border-gray-800'
                      }`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="apple"
                        checked={formData.paymentMethod === 'apple'}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <div className="text-2xl mb-2">🍎</div>
                        <span className="text-sm font-medium text-black dark:text-white">Apple Pay</span>
                      </div>
                    </label>
                  </div>
                </div>

                {formData.paymentMethod === 'card' && (
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                        رقم البطاقة
                      </label>
                      <input
                        type="text"
                        maxLength={19}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-black dark:text-white rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white500 focus:border-transparent outline-none transition"
                        placeholder="1234 5678 9012 3456"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                          تاريخ الانتهاء
                        </label>
                        <input
                          type="text"
                          maxLength={5}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-black dark:text-white rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent outline-none transition"
                          placeholder="MM/YY"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                          CVV
                        </label>
                        <input
                          type="text"
                          maxLength={3}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-black dark:text-white rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent outline-none transition"
                          placeholder="123"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handlePayment}
                  disabled={processing}
                  className="w-full bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 disabled:bg-gray-400 py-4 px-6 rounded-lg font-semibold text-lg transition-colors"
                >
                  {processing ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      جاري معالجة الدفع...
                    </span>
                  ) : (
                    `دفع $${typeof formData.plan?.price === 'string' ? formData.plan.price.replace('$', '') : formData.plan?.price}`
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Website Customization */}
          {currentStep === 4 && (
            <div>
              <h2 className="text-3xl font-bold text-black dark:text-white mb-6 text-center">
                تخصيص موقعك
              </h2>
              <form onSubmit={handleWebsiteCustomization} className="max-w-2xl mx-auto space-y-6">
                {/* Website Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-4">
                    نوع الموقع
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${formData.websiteType === 'store'
                      ? 'border-indigo-600 dark:border-indigo-500 bg-black dark:bg-white50 dark:bg-black dark:bg-white900/20'
                      : 'border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                      }`}>
                      <input
                        type="radio"
                        name="websiteType"
                        value="store"
                        checked={formData.websiteType === 'store'}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <div className="text-4xl mb-3">🛍️</div>
                        <span className="text-lg font-semibold text-black dark:text-white block mb-2">متجر إلكتروني</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">لبيع المنتجات</span>
                      </div>
                    </label>
                    <label className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${formData.websiteType === 'restaurant'
                      ? 'border-indigo-600 dark:border-indigo-500 bg-black dark:bg-white50 dark:bg-black dark:bg-white900/20'
                      : 'border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                      }`}>
                      <input
                        type="radio"
                        name="websiteType"
                        value="restaurant"
                        checked={formData.websiteType === 'restaurant'}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <div className="text-4xl mb-3">🍽️</div>
                        <span className="text-lg font-semibold text-black dark:text-white block mb-2">منيو مطعم</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">لعرض قوائم الطعام</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                    رفع الشعار (اختياري)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors">
                    {formData.logo ? (
                      <div className="space-y-4">
                        <img src={formData.logo} alt="Logo preview" className="max-w-32 max-h-32 mx-auto rounded-lg" />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, logo: null })}
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
                          <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-gray-600 dark:text-gray-400">اضغط لرفع الشعار</span>
                          <span className="text-sm text-gray-500 dark:text-gray-500 mt-1">PNG, JPG أو SVG</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Domain Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-4">
                    نوع الدومين
                  </label>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <label className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.domainType === 'subdomain'
                      ? 'border-indigo-600 dark:border-indigo-500 bg-black dark:bg-white50 dark:bg-black dark:bg-white900/20'
                      : 'border-gray-200 dark:border-gray-800'
                      }`}>
                      <input
                        type="radio"
                        name="domainType"
                        value="subdomain"
                        checked={formData.domainType === 'subdomain'}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <div className="font-semibold text-black dark:text-white mb-1">دومين فرعي</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">example.mel.iq</div>
                      </div>
                    </label>
                    <label className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.domainType === 'custom'
                      ? 'border-indigo-600 dark:border-indigo-500 bg-black dark:bg-white50 dark:bg-black dark:bg-white900/20'
                      : 'border-gray-200 dark:border-gray-800'
                      }`}>
                      <input
                        type="radio"
                        name="domainType"
                        value="custom"
                        checked={formData.domainType === 'custom'}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <div className="font-semibold text-black dark:text-white mb-1">دومين مخصص</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">example.com</div>
                      </div>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                      {formData.domainType === 'subdomain' ? 'اسم الدومين الفرعي' : 'اسم الدومين المخصص'}
                    </label>
                    <div className="flex items-center">
                      {formData.domainType === 'subdomain' ? (
                        <>
                          <input
                            type="text"
                            name="domain"
                            value={formData.domain}
                            onChange={handleInputChange}
                            required
                            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-black dark:text-white rounded-l-lg focus:ring-2 focus:ring-black dark:focus:ring-white500 focus:border-transparent outline-none transition"
                            placeholder="example"
                          />
                          <span className="px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-lg">
                            .ميل.IQ
                          </span>
                        </>
                      ) : (
                        <input
                          type="text"
                          name="domain"
                          value={formData.domain}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-black dark:text-white rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white500 focus:border-transparent outline-none transition"
                          placeholder="example.com"
                        />
                      )}
                    </div>
                    {formData.domain && (
                      <p className="mt-2 text-sm text-black dark:text-white">
                        🔗 رابط موقعك:{' '}
                        <a
                          href={formData.domainType === 'subdomain' ? `https://${formData.domain}.mel.iq` : `https://${formData.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono hover:text-black dark:text-white700 dark:hover:text-black dark:text-white300 hover:underline transition-colors"
                        >
                          {formData.domainType === 'subdomain' ? `https://${formData.domain}.mel.iq` : `https://${formData.domain}`}
                        </a>
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white py-4 px-6 rounded-lg font-semibold text-lg transition-colors"
                >
                  المتابعة إلى القوالب
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Checkout