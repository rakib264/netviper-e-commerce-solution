'use client';

import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettings } from '@/hooks/use-settings';
import { ErrorMessage, Field, Form, Formik } from 'formik';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Lock, Mail, Phone, Shield } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import * as Yup from 'yup';
import { useTranslation, type Translate } from '@/components/providers/LocalizationProvider';

type Step = 'method' | 'phone' | 'email' | 'otp' | 'password';
type VerificationMethod = 'phone' | 'email';

interface PhoneFormValues {
  phone: string;
}

interface EmailFormValues {
  email: string;
}

interface OTPFormValues {
  otp: string;
}

interface PasswordFormValues {
  newPassword: string;
  confirmPassword: string;
}

const phoneValidationSchema = (t: Translate) =>
  Yup.object({
  phone: Yup.string()
    .required(t('auth.forgotPassword.validation.phoneNumberIsRequired'))
    .matches(/^[0-9+\-\s()]+$/, t('auth.forgotPassword.validation.invalidPhoneNumberFormat')),
});

const emailValidationSchema = (t: Translate) =>
  Yup.object({
  email: Yup.string()
    .email(t('auth.forgotPassword.validation.invalidEmailAddress'))
    .required(t('auth.forgotPassword.validation.emailIsRequired')),
});

const otpValidationSchema = (t: Translate) =>
  Yup.object({
  otp: Yup.string()
    .required(t('auth.forgotPassword.validation.verificationCodeIsRequired'))
    .matches(/^[0-9]{6}$/, t('auth.forgotPassword.validation.codeMustBe6Digits')),
});

const passwordValidationSchema = (t: Translate) =>
  Yup.object({
  newPassword: Yup.string()
    .min(8, t('auth.forgotPassword.validation.passwordMustBeAtLeast8'))
    .required(t('auth.forgotPassword.validation.passwordIsRequired')),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword')], t('auth.forgotPassword.validation.passwordsMustMatch'))
    .required(t('auth.forgotPassword.validation.pleaseConfirmYourPassword')),
});

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('method');
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [authSettings, setAuthSettings] = useState({
    otpAuthEnabled: false,
    requireEmailVerification: false
  });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const router = useRouter();
  const { settings } = useSettings();
  const { siteName, logo1 } = settings ?? {};

  useEffect(() => {
    const fetchAuthSettings = async () => {
      try {
        const response = await fetch('/api/auth-settings');
        if (response.ok) {
          const settings = await response.json();
          setAuthSettings({
            otpAuthEnabled: settings.otpAuthEnabled,
            requireEmailVerification: settings.requireEmailVerification
          });
        }
      } catch (error) {
        console.error('Failed to fetch auth settings:', error);
      } finally {
        setSettingsLoading(false);
      }
    };

    fetchAuthSettings();
  }, []);

  const handleMethodSelection = (method: VerificationMethod) => {
    setVerificationMethod(method);
    // Clear all fields when starting the process
    setPhone('');
    setEmail('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    if (method === 'phone') {
      setStep('phone');
    } else {
      setStep('email');
    }
  };

  const handleSendOTP = async (values: PhoneFormValues | EmailFormValues, { setSubmitting }: any) => {
    setLoading(true);
    setError('');

    try {
      const payload = verificationMethod === 'phone' 
        ? { phone: (values as PhoneFormValues).phone, type: 'password_reset' }
        : { email: (values as EmailFormValues).email, type: 'password_reset' };

      // Store the phone/email for later use in OTP verification
      if (verificationMethod === 'phone') {
        setPhone((values as PhoneFormValues).phone);
      } else {
        setEmail((values as EmailFormValues).email);
      }

      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('OTP sent successfully');
        setOtp(''); // Clear OTP field when moving to verification step
        setStep('otp');
      } else {
        setError(data.error || t('auth.forgotPassword.messages.failedToSendOtp'));
      }
    } catch (error) {
      setError(t('auth.forgotPassword.messages.somethingWentWrong'));
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const handleVerifyOTP = async (values: OTPFormValues, { setSubmitting }: any) => {
    setLoading(true);
    setError('');

    try {
      const payload = verificationMethod === 'phone' 
        ? { phone, otp: values.otp, type: 'password_reset' }
        : { email, otp: values.otp, type: 'password_reset' };

      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('OTP verified successfully');
        setOtp(''); // Clear OTP field when moving to password reset step
        setNewPassword(''); // Clear password fields
        setConfirmPassword(''); // Clear password fields
        setStep('password');
      } else {
        setError(data.error || t('auth.forgotPassword.messages.invalidOtp'));
      }
    } catch (error) {
      setError(t('auth.forgotPassword.messages.somethingWentWrong'));
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (values: PasswordFormValues, { setSubmitting }: any) => {
    setLoading(true);
    setError('');

    try {
      const payload = verificationMethod === 'phone' 
        ? { phone, newPassword: values.newPassword }
        : { email, newPassword: values.newPassword };

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Password reset successfully');
        setTimeout(() => {
          router.push('/auth/signin?message=Password reset successfully');
        }, 2000);
      } else {
        setError(data.error || t('auth.forgotPassword.messages.failedToResetPassword'));
      }
    } catch (error) {
      setError(t('auth.forgotPassword.messages.somethingWentWrong'));
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 'method':
        const availableMethods = [];
        
        if (authSettings.otpAuthEnabled) {
          availableMethods.push(
            <Button
              key="phone"
              type="button"
              variant="outline"
              onClick={() => handleMethodSelection('phone')}
              className="h-12 sm:h-14 text-left px-4 sm:px-6 border-2 border-primary-200 hover:border-primary-300 hover:bg-primary-50 transition-all duration-200 group touch-manipulation"
            >
              <div className="flex items-center space-x-3 sm:space-x-4">
                <Phone className="text-primary-600 group-hover:text-primary-700 transition-colors duration-200" size={20} />
                <div>
                  <div className="font-semibold text-foreground text-sm sm:text-base">{t('auth.forgotPassword.phoneNumber')}</div>
                  <div className="text-xs sm:text-sm font-caption text-muted-foreground">
                    {t('auth.forgotPassword.receiveCodeViaSms')}
                  </div>
                </div>
              </div>
            </Button>
          );
        }

        if (authSettings.requireEmailVerification) {
          availableMethods.push(
            <Button
              key="email"
              type="button"
              variant="outline"
              onClick={() => handleMethodSelection('email')}
              className="h-12 sm:h-14 text-left px-4 sm:px-6 border-2 border-secondary-200 hover:border-secondary-300 hover:bg-secondary-50 transition-all duration-200 group touch-manipulation"
            >
              <div className="flex items-center space-x-3 sm:space-x-4">
                <Mail className="text-secondary-600 group-hover:text-secondary-700 transition-colors duration-200" size={20} />
                <div>
                  <div className="font-semibold text-foreground text-sm sm:text-base">{t('auth.forgotPassword.emailAddress')}</div>
                  <div className="text-xs sm:text-sm font-caption text-muted-foreground">
                    {t('auth.forgotPassword.receiveCodeViaEmail')}
                  </div>
                </div>
              </div>
            </Button>
          );
        }

        if (availableMethods.length === 0) {
          return (
            <div className="text-center space-y-4">
              <div className="text-muted-foreground">
                {t('auth.forgotPassword.passwordResetIsCurrentlyUnavailablePlease')}
              </div>
            </div>
          );
        }

        if (availableMethods.length === 1) {
          // Auto-select the only available method
          const method = authSettings.otpAuthEnabled ? 'phone' : 'email';
          setTimeout(() => handleMethodSelection(method), 0);
        }

        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="text-center">
              <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4">{t('auth.forgotPassword.chooseVerificationMethod')}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
                {t('auth.forgotPassword.selectHowYouDLikeTo')}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              {availableMethods}
            </div>
          </div>
        );

      case 'phone':
        return (
          <Formik
            initialValues={{ phone }}
            validationSchema={phoneValidationSchema(t)}
            onSubmit={handleSendOTP}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-4 sm:space-y-6">
                <div className="space-y-2 sm:space-y-3">
                  <label htmlFor="phone" className="block text-xs sm:text-sm font-semibold text-foreground mb-1 sm:mb-2">{t('auth.forgotPassword.phoneNumber')}</label>
                  <div className="relative group">
                    <Phone className="absolute z-10 left-3 sm:left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary-600 transition-colors duration-200" size={16} />
                    <Field name="phone">
                      {({ field }: any) => (
                        <Input
                          {...field}
                          id="phone"
                          type="tel"
                          placeholder={t('auth.forgotPassword.enterYourPhoneNumber')}
                          className="pl-10 sm:pl-12 h-10 sm:h-12 text-sm sm:text-base border-2 border-primary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all duration-200 touch-manipulation"
                        />
                      )}
                    </Field>
                  </div>
                  <ErrorMessage name="phone" component="div" className="text-destructive-500 text-xs sm:text-sm mt-1" />
                  <p className="text-xs text-muted-foreground">
                    {t('auth.forgotPassword.weLlSendAVerificationCode')}
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={loading || isSubmitting}
                  className="w-full h-10 sm:h-12 text-sm sm:text-base font-semibold bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 shadow-lg hover:shadow-xl transition-all duration-300 touch-manipulation"
                >
                  {loading || isSubmitting ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                  ) : (
                    <>
                      {t('auth.forgotPassword.sendOtp')}
                      <ArrowRight className="ml-1 sm:ml-2" size={16} />
                    </>
                  )}
                </Button>
              </Form>
            )}
          </Formik>
        );

      case 'email':
        return (
          <Formik
            initialValues={{ email }}
            validationSchema={emailValidationSchema(t)}
            onSubmit={handleSendOTP}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-4 sm:space-y-6">
                <div className="space-y-2 sm:space-y-3">
                  <label htmlFor="email" className="block text-xs sm:text-sm font-semibold text-foreground mb-1 sm:mb-2">{t('auth.forgotPassword.emailAddress')}</label>
                  <div className="relative group">
                    <Mail className="absolute z-10 left-3 sm:left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary-600 transition-colors duration-200" size={16} />
                    <Field name="email">
                      {({ field }: any) => (
                        <Input
                          {...field}
                          id="email"
                          type="email"
                          placeholder={t('auth.forgotPassword.enterYourEmailAddress')}
                          className="pl-10 sm:pl-12 h-10 sm:h-12 text-sm sm:text-base border-2 border-primary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all duration-200 touch-manipulation"
                        />
                      )}
                    </Field>
                  </div>
                  <ErrorMessage name="email" component="div" className="text-destructive-500 text-xs sm:text-sm mt-1" />
                  <p className="text-xs text-muted-foreground">
                    {t('auth.forgotPassword.weLlSendAVerificationCode2')}
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={loading || isSubmitting}
                  className="w-full h-10 sm:h-12 text-sm sm:text-base font-semibold bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 shadow-lg hover:shadow-xl transition-all duration-300 touch-manipulation"
                >
                  {loading || isSubmitting ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                  ) : (
                    <>
                      {t('auth.forgotPassword.sendOtp')}
                      <ArrowRight className="ml-1 sm:ml-2" size={16} />
                    </>
                  )}
                </Button>
              </Form>
            )}
          </Formik>
        );

      case 'otp':
        return (
          <Formik
            initialValues={{ otp: '' }}
            validationSchema={otpValidationSchema(t)}
            onSubmit={handleVerifyOTP}
            enableReinitialize={true}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-4 sm:space-y-6">
                <div className="space-y-2 sm:space-y-3">
                  <label htmlFor="otp" className="block text-xs sm:text-sm font-semibold text-foreground mb-1 sm:mb-2">{t('auth.forgotPassword.verificationCode')}</label>
                  <div className="relative group">
                    <Shield className="absolute z-10 left-3 sm:left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary-600 transition-colors duration-200" size={16} />
                    <Field name="otp">
                      {({ field }: any) => (
                        <Input
                          {...field}
                          id="otp"
                          type="text"
                          placeholder={t('auth.forgotPassword.enter6DigitCode')}
                          className="pl-10 sm:pl-12 h-10 sm:h-12 text-center text-sm sm:text-lg tracking-widest border-2 border-primary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all duration-200 touch-manipulation"
                          maxLength={6}
                        />
                      )}
                    </Field>
                  </div>
                  <ErrorMessage name="otp" component="div" className="text-destructive-500 text-xs sm:text-sm mt-1" />
                  <p className="text-xs text-muted-foreground">
                    {t('auth.forgotPassword.enterThe6DigitCodeSent')} {verificationMethod === 'phone' ? phone : email}
                  </p>
                </div>

                <div className="flex space-x-2 sm:space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(verificationMethod === 'phone' ? 'phone' : 'email')}
                    className="flex-1 h-10 sm:h-12 text-xs sm:text-sm font-medium border-2 border-primary-200 hover:border-primary-300 hover:bg-primary-50 transition-all duration-200 touch-manipulation"
                  >
                    <ArrowLeft className="mr-1 sm:mr-2" size={16} />
                    {t('auth.forgotPassword.back')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || isSubmitting}
                    className="flex-1 h-10 sm:h-12 text-sm sm:text-base font-semibold bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 shadow-lg hover:shadow-xl transition-all duration-300 touch-manipulation"
                  >
                    {loading || isSubmitting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      <>
                        {t('auth.forgotPassword.verify')}
                        <ArrowRight className="ml-1 sm:ml-2" size={16} />
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      const values = verificationMethod === 'phone' ? { phone } : { email };
                      handleSendOTP(values, { setSubmitting: () => {} });
                    }}
                    className="text-xs sm:text-sm text-primary hover:underline touch-manipulation"
                  >
                    {t('auth.forgotPassword.didnTReceiveCodeResend')}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        );

      case 'password':
        return (
          <Formik
            initialValues={{ newPassword: '', confirmPassword: '' }}
            validationSchema={passwordValidationSchema(t)}
            onSubmit={handleResetPassword}
            enableReinitialize={true}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-4 sm:space-y-6">
                <div className="space-y-2 sm:space-y-3">
                  <Label htmlFor="newPassword" className="block text-xs sm:text-sm font-semibold text-foreground mb-1 sm:mb-2">{t('auth.forgotPassword.newPassword')}</Label>
                  <div className="relative group">
                    <Lock className="absolute z-10 left-3 sm:left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary-600 transition-colors duration-200" size={16} />
                    <Field name="newPassword">
                      {({ field }: any) => (
                        <Input
                          {...field}
                          id="newPassword"
                          type="password"
                          placeholder={t('auth.forgotPassword.enterNewPassword')}
                          className="pl-10 sm:pl-12 h-10 sm:h-12 text-sm sm:text-base border-2 border-primary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all duration-200 touch-manipulation"
                        />
                      )}
                    </Field>
                  </div>
                  <ErrorMessage name="newPassword" component="div" className="text-destructive-500 text-xs sm:text-sm mt-1" />
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <Label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-semibold text-foreground mb-1 sm:mb-2">{t('auth.forgotPassword.confirmPassword')}</Label>
                  <div className="relative group">
                    <Lock className="absolute z-10 left-3 sm:left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary-600 transition-colors duration-200" size={16} />
                    <Field name="confirmPassword">
                      {({ field }: any) => (
                        <Input
                          {...field}
                          id="confirmPassword"
                          type="password"
                          placeholder={t('auth.forgotPassword.confirmNewPassword')}
                          className="pl-10 sm:pl-12 h-10 sm:h-12 text-sm sm:text-base border-2 border-primary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all duration-200 touch-manipulation"
                        />
                      )}
                    </Field>
                  </div>
                  <ErrorMessage name="confirmPassword" component="div" className="text-destructive-500 text-xs sm:text-sm mt-1" />
                </div>

                <Button
                  type="submit"
                  disabled={loading || isSubmitting}
                  className="w-full h-10 sm:h-12 text-sm sm:text-base font-semibold bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 shadow-lg hover:shadow-xl transition-all duration-300 touch-manipulation"
                >
                  {loading || isSubmitting ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                  ) : (
                    <>
                      {t('auth.forgotPassword.resetPassword')}
                      <ArrowRight className="ml-1 sm:ml-2" size={16} />
                    </>
                  )}
                </Button>
              </Form>
            )}
          </Formik>
        );
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'method': return 'Forgot Password';
      case 'phone': return 'Phone Verification';
      case 'email': return 'Email Verification';
      case 'otp': return 'Verify Code';
      case 'password': return 'Reset Password';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 'method': return 'Choose how you want to verify your identity';
      case 'phone': return 'Enter your phone number to receive a verification code';
      case 'email': return 'Enter your email address to receive a verification code';
      case 'otp': return 'Enter the verification code sent to your contact method';
      case 'password': return 'Create a new password for your account';
    }
  };

  if (settingsLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-50 via-white to-secondary-50">
        {/* Header for desktop */}
        <div className="mb-8 sm:mb-12 md:mb-16 lg:mb-20">
          <Header />
        </div>
        
        {/* Main content */}
        <div className="flex-1 flex items-center justify-center px-3 sm:px-4 py-2 sm:py-4 md:py-8">
          <div className="w-full max-w-sm sm:max-w-md mx-auto">
            <div className="max-h-[calc(100vh-80px)] sm:max-h-[calc(100vh-120px)] md:max-h-[calc(100vh-160px)] overflow-y-auto auth-scrollbar">
              <Card className="shadow-2xl w-full mx-auto bg-card/90 backdrop-blur-sm border-[1px] border-primary-200 shadow-primary-200" style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
                <CardContent className="flex items-center justify-center py-12 sm:py-16 px-4 sm:px-6">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-primary border-t-transparent rounded-full"
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        
        {/* Footer for desktop */}
        <div className="hidden md:block">
          <Footer />
        </div>
        
        {/* Mobile Bottom Navigation */}
        <div className="md:hidden">
          <MobileBottomNav />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Header for desktop */}
      <div className="mb-8 sm:mb-12 md:mb-16 lg:mb-20">
        <Header />
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-3 sm:px-4 py-2 sm:py-4 md:py-8">
        <div className="w-full max-w-sm sm:max-w-md mx-auto">
          <div className="max-h-[calc(100vh-80px)] sm:max-h-[calc(100vh-120px)] md:max-h-[calc(100vh-160px)] overflow-y-auto auth-scrollbar">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="w-full"
            >
              <Card className="shadow-2xl w-full mx-auto bg-card/90 backdrop-blur-sm border-[1px] border-primary-200 shadow-primary-200" style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
                <CardHeader className="text-center pb-4 sm:pb-6 md:pb-8 px-4 sm:px-6 md:px-8 pt-6 sm:pt-8">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
                    className="mb-4 sm:mb-6"
                  >
                    <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-full flex items-center justify-center shadow-lg">
                      <Lock className="text-white" size={24} />
                      <div className="absolute -inset-3 sm:-inset-4 bg-gradient-to-r from-primary-200 to-secondary-200 rounded-full blur-sm opacity-30 -z-10"></div>
                    </div>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-2">
                      {getStepTitle()}
                    </CardTitle>
                    <p className="text-muted-foreground text-sm sm:text-base">
                      {getStepDescription()}
                    </p>
                  </motion.div>
                </CardHeader>

                <CardContent className="px-4 sm:px-6 md:px-8 pb-4 sm:pb-6 md:pb-8">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-destructive-50 border border-destructive-200 text-destructive-600 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm mb-4 sm:mb-6"
                    >
                      {error}
                    </motion.div>
                  )}

                  {success && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-success-50 border border-success-200 text-success-600 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm mb-4 sm:mb-6"
                    >
                      {success}
                    </motion.div>
                  )}

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                  >
                    {renderStepContent()}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="mt-6 sm:mt-8 text-center"
                  >
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {t('auth.forgotPassword.rememberYourPassword')}{' '}
                      <Link href="/auth/signin" className="text-primary-600 hover:text-primary-700 hover:underline font-semibold transition-colors duration-200 touch-manipulation">
                        {t('auth.forgotPassword.signIn')}
                      </Link>
                    </p>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Footer for desktop */}
      <div className="hidden md:block">
        <Footer />
      </div>
      
      {/* Mobile Bottom Navigation */}
      <div className="md:hidden">
        <MobileBottomNav />
      </div>
    </div>
  );
}