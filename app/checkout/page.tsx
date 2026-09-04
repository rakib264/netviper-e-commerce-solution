'use client';

import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { useTranslation } from '@/components/providers/LocalizationProvider';
import { Button } from '@/components/ui/button';
import { useErrorDialog } from '@/components/ui/error-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QuantityBadge } from '@/components/ui/quantity-badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useCourierSettings } from '@/hooks/use-settings';
import GeonamesService from '@/lib/geonames';
import { applyCoupon, clearCart, removeCoupon } from '@/lib/store/slices/cartSlice';
import { RootState } from '@/lib/store/store';
import { cn, formatEuroCurrency } from '@/lib/utils';
import { useFormik } from 'formik';
import {
  ArrowLeft, ArrowRight,
  Check,
  CheckCircle,
  CreditCard,
  Lock,
  MapPin,
  Tag,
  Truck,
  User
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as Yup from 'yup';

const TOTAL_STEPS = 2;

/** Field label + input spacing is identical everywhere, so it lives in one place. */
const fieldLabelClass = 'mb-1.5 block typography-label text-hierarchy-label';
const fieldErrorClass = 'mt-1.5 typography-micro text-destructive';

/** A titled panel — the single visual container used across the whole flow. */
function Panel({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Icon size={15} />
          </span>
          <h2 className="typography-card-title text-hierarchy-title">{title}</h2>
        </div>
        {action}
      </header>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

/** A read-only label/value pair used in the review step. */
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="typography-micro shrink-0 uppercase tracking-wide text-muted-foreground sm:w-32">
        {label}
      </dt>
      <dd className="typography-caption text-hierarchy-body">{value}</dd>
    </div>
  );
}

export default function CheckoutPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: session } = useSession();
  const dispatch = useDispatch();
  const { items, discount, dealDiscount, couponCode: appliedCoupon } = useSelector((state: RootState) => state.cart);

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState({
    isPaymentGatewayEnabled: false,
    codEnabled: true
  });
  const [displayErrors, setDisplayErrors] = useState<{[key: string]: string}>({});

  // Function to clear specific field error when user starts typing
  const clearFieldError = (fieldName: string) => {
    if (displayErrors[fieldName]) {
      const newErrors = { ...displayErrors };
      delete newErrors[fieldName];
      setDisplayErrors(newErrors);
    }
  };

  // Error dialog hook
  const { showError, ErrorDialogComponent } = useErrorDialog();

  // Geonames service instance (memoized to avoid recreation on every render)
  const geonamesService = useMemo(() => new GeonamesService(), []);

  // Formik + Yup for step validation. Step 1 now covers the address *and* the
  // payment method, so its schema is the union of the two former steps.
  const step1Schema = useMemo(() => Yup.object({
    firstName: Yup.string().trim().required(t('checkout.validation.firstNameIsRequired')),
    lastName: Yup.string().trim().required(t('checkout.validation.lastNameIsRequired')),
    email: Yup.string().email(t('checkout.validation.invalidEmail')).optional(),
    phone: Yup.string().trim().matches(/^(\+880|880|0)?(1[3-9]\d{8})$/, t('checkout.validation.invalidPhoneNumber')).required(t('checkout.validation.phoneIsRequired')),
    address: Yup.string().trim().required(t('checkout.validation.addressIsRequired')),
    division: Yup.string().trim().required(t('checkout.validation.divisionIsRequired')),
    district: Yup.string().trim().required(t('checkout.validation.districtIsRequired')),
    postalCode: Yup.string().trim().optional(),
    method: Yup.mixed<'cod' | 'sslcommerz'>().oneOf(['cod', 'sslcommerz']).required(t('checkout.validation.paymentMethodIsRequired')),
  }), [t]);

  const step2Schema = useMemo(() => Yup.object({
    notes: Yup.string().max(500, t('checkout.validation.notesMustBeAtMost500')).optional(),
  }), [t]);

  const formik = useFormik({
    enableReinitialize: true,
    validateOnMount: false, // Disable auto-validation to handle it manually
    initialValues: {
      firstName: session?.user?.name?.split(' ')[0] || '',
      lastName: session?.user?.name?.split(' ').slice(1).join(' ') || '',
      email: session?.user?.email || '',
      phone: '',
      address: '',
      city: '',
      district: '',
      division: '',
      postalCode: '',
      coordinates: {
        lat: 0,
        lng: 0,
        divisionName: '',
        district: '',
        thanaOrUpazilaName: '',
        placeName: '',
        countryCode: ''
      },
      method: 'cod' as 'cod' | 'sslcommerz',
      notes: ''
    },
    onSubmit: () => {}
  });

  // Prevent hydration mismatches by rendering client-derived values only after mount
  const [hasHydrated, setHasHydrated] = useState(false);
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // The step panel scrolls independently on desktop, so a step change has to
  // rewind it — otherwise the new step opens half-way down.
  const stepPanelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    stepPanelRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  useEffect(() => {
    if (items.length === 0 && hasHydrated && !loading && !orderPlaced) {
      router.push('/products');
    }
    fetchPaymentSettings();
  }, [items.length, hasHydrated, loading, orderPlaced, router]);

  const fetchPaymentSettings = async () => {
    try {
      const response = await fetch('/api/payment/settings');
      const data = await response.json();
      setPaymentSettings(data);
    } catch (error) {
      console.error('Error fetching payment settings:', error);
    }
  };

  const { settings: courierSettings } = useCourierSettings();

  const calculateShipping = () => {
    // The district is captured in step 1 alongside payment, so the rate can be
    // resolved as soon as it is filled in rather than after a step transition.
    if (!formik.values.district?.trim()) {
      return 0;
    }

    const district = (formik.values.district || formik.values.city || '').toLowerCase().trim();
    const isDhaka = district.includes('dhaka');
    const inside = courierSettings?.insideDhaka ?? 60;
    const outside = courierSettings?.outsideDhaka ?? 120;
    return isDhaka ? inside : outside;
  };

  const getDeliveryType = () => {
    // Only determine delivery type if we have district information
    if (!formik.values.district?.trim()) {
      return 'regular';
    }

    const district = (formik.values.district || formik.values.city || '').toLowerCase().trim();
    const isDhaka = district.includes('dhaka');
    return isDhaka ? 'Inside Dhaka' : 'Outside Dhaka';
  };

  const handleCouponApply = async () => {
    if (!couponCode.trim()) return;

    setCouponLoading(true);
    try {
      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, subtotal })
      });

      const data = await response.json();

      if (response.ok) {
        dispatch(applyCoupon({ code: couponCode, discount: data.discount }));
        setCouponCode('');
      } else {
        showError(data.error || t('checkout.messages.invalidCouponCode'), t('checkout.messages.couponError'));
      }
    } catch (error) {
      showError(t('checkout.messages.failedToApplyCoupon'), 'Error');
    } finally {
      setCouponLoading(false);
    }
  };

  const validateStep = (step: number) => {
    try {
      const schema = step === 1 ? step1Schema : step === 2 ? step2Schema : null;
      if (!schema) return true;

      // Validate using the appropriate schema
      schema.validateSync(formik.values, { abortEarly: false });

      // Clear any existing errors for this step
      formik.setErrors({});
      setDisplayErrors({});
      return true;
    } catch (error) {
      // Set validation errors in formik
      if (error instanceof Yup.ValidationError) {
        const errors: { [key: string]: string } = {};
        error.inner.forEach((err) => {
          if (err.path) {
            errors[err.path] = err.message;
          }
        });

        // Set errors in both formik and local state for reliable display
        formik.setErrors(errors);
        setDisplayErrors(errors);

        // Mark all fields as touched to show errors
        const touched: { [key: string]: boolean } = {};
        Object.keys(errors).forEach(key => {
          touched[key] = true;
        });
        formik.setTouched(touched);
      }
      return false;
    }
  };

  const ensureGeocodedIfNeeded = async () => {
    try {
      if (currentStep === 1) {
        // Geonames service requires postal code for geocoding
        if (!formik.values.postalCode?.trim()) return;

        const result = await geonamesService.geocodeByPostalCode(formik.values.postalCode.trim(), 'BD');

        if (result) {
          // Store coordinates object with Geonames data
          const coordinates = {
            lat: result.lat,
            lng: result.lng,
            // Additional Geonames data for potential future use
            divisionName: result.divisionName,
            district: result.district,
            thanaOrUpazilaName: result.thanaOrUpazilaName,
            placeName: result.placeName,
            countryCode: result.countryCode
          };

          formik.setFieldValue('coordinates', coordinates);

          // Optionally auto-fill division and district if not already provided
          if (!formik.values.division?.trim() && result.divisionName) {
            formik.setFieldValue('division', result.divisionName);
          }
          if (!formik.values.district?.trim() && result.district) {
            formik.setFieldValue('district', result.district);
          }
        }
      }
    } catch (e) {
      // Silently ignore to avoid blocking step transition
      console.error('Geocoding error (non-blocking):', e);
    }
  };

  const nextStep = async () => {
    if (validateStep(currentStep)) {
      await ensureGeocodedIfNeeded();
      setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const shipping = calculateShipping();
  // The cart's `total` already has the coupon subtracted, so reusing it here
  // would discount twice — once inside it and again on the discount line. The
  // line items are the only unambiguous source, and gift lines price at 0, so
  // this mirrors what `POST /api/orders` recomputes server-side.
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const finalTotal = Math.max(0, subtotal - discount - dealDiscount + shipping);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const steps = [
    { number: 1, title: t('checkout.deliveryAndPayment') },
    { number: 2, title: t('checkout.reviewAndPlaceOrder') }
  ];

  const formattedAddress = [
    formik.values.address,
    formik.values.district,
    formik.values.division,
    formik.values.postalCode
  ].filter(part => part && String(part).trim()).join(', ');

  const placeOrder = async () => {
    setLoading(true);
    try {
      // Create order first
      const shippingAddress = {
        name: `${formik.values.firstName} ${formik.values.lastName}`.trim(),
        phone: formik.values.phone,
        email: formik.values.email,
        street: formik.values.address,
        city: formik.values.city || formik.values.district || formik.values.division,
        district: formik.values.district || '',
        division: formik.values.division || '',
        postalCode: formik.values.postalCode || '',
        coordinates: formik.values.coordinates && (formik.values.coordinates.lat !== 0 || formik.values.coordinates.lng !== 0)
          ? {
              lat: formik.values.coordinates.lat,
              lng: formik.values.coordinates.lng,
              // Include additional Geonames data if available
              ...(formik.values.coordinates.divisionName && {
                divisionName: formik.values.coordinates.divisionName,
                district: formik.values.coordinates.district,
                thanaOrUpazilaName: formik.values.coordinates.thanaOrUpazilaName,
                placeName: formik.values.coordinates.placeName,
                countryCode: formik.values.coordinates.countryCode
              })
            }
          : undefined
      };

      const orderData = {
        // Gift lines are omitted: the server re-runs the deals engine and
        // injects its own, so sending them back would be pointless at best.
        items: items
          .filter(item => !item.isGift)
          .map(item =>
            item.itemType === 'combo_bundle'
              ? {
                  // A combo line names the offer, not a product. Its price and
                  // composition are recomputed server-side, so only the
                  // identity and the quantity are worth sending.
                  itemType: 'combo_bundle' as const,
                  comboBundleId: item.comboBundleId || item.id,
                  name: item.name,
                  quantity: item.quantity,
                }
              : {
                  product: item.id,
                  name: item.name,
                  quantity: item.quantity,
                  variant: item.variant
                }
          ),
        paymentMethod: formik.values.method,
        shippingCost: shipping,
        discount,
        couponCode: appliedCoupon || undefined,
        shippingAddress,
        billingAddress: shippingAddress,
        deliveryType: getDeliveryType(),
        notes: formik.values.notes
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();

      if (response.ok) {
        const orderId = data.order._id;

        // Handle payment method
        if (formik.values.method === 'sslcommerz') {
          // Initiate SSLCommerz payment
          const paymentResponse = await fetch('/api/payment/sslcommerz/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId })
          });

          const paymentData = await paymentResponse.json();

          if (paymentResponse.ok && paymentData.success) {
            // Clear cart and redirect to payment gateway
            dispatch(clearCart());
            window.location.href = paymentData.paymentUrl;
          } else {
            throw new Error(paymentData.error || 'Payment initiation failed');
          }
        } else {
          // COD - redirect to order confirmation first to avoid checkout empty-cart redirect
          setOrderPlaced(true);
          router.push(`/orders/${orderId}?success=true`);
          setTimeout(() => dispatch(clearCart()), 0);
        }
      } else {
        throw new Error(data.error || 'Failed to place order');
      }
    } catch (error) {
      console.error('Order placement error:', error);
      showError(error instanceof Error ? error.message : t('checkout.messages.failedToPlaceOrder'), t('checkout.messages.orderError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* On desktop the header plus the checkout make up exactly one viewport, so
          the two panes below can own their own scrolling instead of the page.
          The header sizes itself and `main` takes whatever is left. */}
      <div className="lg:flex lg:h-screen lg:flex-col">
        <Header />

        <main className="container mx-auto px-4 pb-24 pt-6 md:pb-12 md:pt-8 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:pb-6">
        {/* Page heading + step indicator */}
        <div className="mb-6 md:mb-8 lg:shrink-0">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h1 className="typography-section-title text-hierarchy-title">{t('checkout.title')}</h1>

            {/* Desktop step indicator */}
            <ol className="hidden items-center gap-4 md:flex">
              {steps.map((step, index) => (
                <li key={step.number} className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => step.number < currentStep && setCurrentStep(step.number)}
                    disabled={step.number >= currentStep}
                    className="flex items-center gap-2.5 disabled:cursor-default"
                  >
                    <span
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full border typography-micro transition-colors',
                        currentStep > step.number
                          ? 'border-primary bg-primary text-primary-foreground'
                          : currentStep === step.number
                            ? 'border-primary text-primary'
                            : 'border-border text-muted-foreground'
                      )}
                    >
                      {currentStep > step.number ? <Check size={13} /> : step.number}
                    </span>
                    <span
                      className={cn(
                        'typography-label',
                        currentStep >= step.number ? 'text-hierarchy-title' : 'text-hierarchy-subtitle'
                      )}
                    >
                      {step.title}
                    </span>
                  </button>
                  {index < steps.length - 1 && (
                    <span className={cn('h-px w-10', currentStep > step.number ? 'bg-primary' : 'bg-border')} />
                  )}
                </li>
              ))}
            </ol>
          </div>

          {/* Mobile step indicator */}
          <div className="mt-4 md:hidden">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <span className="typography-label text-hierarchy-title">{steps[currentStep - 1]?.title}</span>
              <span className="typography-micro text-muted-foreground">
                {t('common.stepOf', { step: currentStep, total: TOTAL_STEPS })}
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[minmax(0,1fr)] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
          {/* ── Step content: fixed on desktop, scrolls within itself ── */}
          <div className="order-2 min-w-0 lg:order-1 lg:flex lg:max-h-full lg:flex-col">
            <div ref={stepPanelRef} className="custom-scrollbar lg:min-h-0 lg:flex-auto lg:overflow-y-auto lg:pr-3">
              {/* One keyed panel per step: the key remounts the content so the
                  enter animation replays. The animation is CSS rather than
                  JS-driven — a throttled rAF used to strand the outgoing panel
                  mid-exit, and with AnimatePresence's mode="wait" the next step
                  then never mounted at all. A CSS animation always settles on
                  its final frame, so the step can never be left invisible. */}
              <div
                key={currentStep}
                className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out"
              >
                {/* Step 1: Delivery & Payment */}
                {currentStep === 1 && (
                  <>
                    <Panel title={t('checkout.contactDetails')} icon={User}>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="firstName" className={fieldLabelClass}>{t('checkout.firstName')}</Label>
                          <Input
                            id="firstName"
                            {...formik.getFieldProps('firstName')}
                            onChange={(e) => {
                              formik.handleChange(e);
                              clearFieldError('firstName');
                            }}
                            placeholder={t('checkout.firstName2')}
                            required
                          />
                          {displayErrors.firstName && (
                            <p className={fieldErrorClass}>{displayErrors.firstName}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="lastName" className={fieldLabelClass}>{t('checkout.lastName')}</Label>
                          <Input
                            id="lastName"
                            {...formik.getFieldProps('lastName')}
                            onChange={(e) => {
                              formik.handleChange(e);
                              clearFieldError('lastName');
                            }}
                            placeholder={t('checkout.lastName2')}
                            required
                          />
                          {displayErrors.lastName && (
                            <p className={fieldErrorClass}>{displayErrors.lastName}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="email" className={fieldLabelClass}>{t('checkout.emailOptional')}</Label>
                          <Input
                            id="email"
                            type="email"
                            {...formik.getFieldProps('email')}
                            placeholder={t('checkout.yourEmailCom')}
                          />
                          {displayErrors.email && (
                            <p className={fieldErrorClass}>{displayErrors.email}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="phone" className={fieldLabelClass}>{t('checkout.phone')}</Label>
                          <Input
                            id="phone"
                            {...formik.getFieldProps('phone')}
                            onChange={(e) => {
                              formik.handleChange(e);
                              clearFieldError('phone');
                            }}
                            placeholder="01721456789"
                            required
                          />
                          {displayErrors.phone && (
                            <p className={fieldErrorClass}>{displayErrors.phone}</p>
                          )}
                        </div>
                      </div>
                    </Panel>

                    <Panel title={t('checkout.deliveryAddress')} icon={MapPin}>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="address" className={fieldLabelClass}>{t('checkout.address')}</Label>
                          <Input
                            id="address"
                            {...formik.getFieldProps('address')}
                            onChange={(e) => {
                              formik.handleChange(e);
                              clearFieldError('address');
                              formik.setFieldValue('coordinates', { lat: 0, lng: 0, divisionName: '', district: '', thanaOrUpazilaName: '', placeName: '', countryCode: '' });
                            }}
                            placeholder={t('checkout.house23JigatalaBusStand')}
                            required
                          />
                          {displayErrors.address && (
                            <p className={fieldErrorClass}>{displayErrors.address}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                          <div>
                            <Label htmlFor="division" className={fieldLabelClass}>{t('checkout.division')}</Label>
                            <Input
                              id="division"
                              {...formik.getFieldProps('division')}
                              onChange={(e) => {
                                formik.handleChange(e);
                                clearFieldError('division');
                              }}
                              placeholder={t('checkout.dhaka')}
                              required
                            />
                            {displayErrors.division && (
                              <p className={fieldErrorClass}>{displayErrors.division}</p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="district" className={fieldLabelClass}>{t('checkout.district')}</Label>
                            <Input
                              id="district"
                              {...formik.getFieldProps('district')}
                              onChange={(e) => {
                                formik.handleChange(e);
                                clearFieldError('district');
                              }}
                              placeholder={t('checkout.dhaka')}
                              required
                            />
                            {displayErrors.district && (
                              <p className={fieldErrorClass}>{displayErrors.district}</p>
                            )}
                          </div>
                          <div className="col-span-2 lg:col-span-1">
                            <Label htmlFor="postalCode" className={fieldLabelClass}>{t('checkout.postalCode')}</Label>
                            <Input
                              id="postalCode"
                              {...formik.getFieldProps('postalCode')}
                              onChange={(e) => {
                                formik.handleChange(e);
                                // Clear coordinates when postal code changes to ensure fresh geocoding on next step
                                formik.setFieldValue('coordinates', { lat: 0, lng: 0, divisionName: '', district: '', thanaOrUpazilaName: '', placeName: '', countryCode: '' });
                              }}
                              placeholder="1209"
                            />
                            {displayErrors.postalCode && (
                              <p className={fieldErrorClass}>{displayErrors.postalCode}</p>
                            )}
                          </div>
                        </div>

                        {/* Delivery charge, resolved live from the district above */}
                        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/40 px-4 py-3">
                          <div className="min-w-0">
                            <p className="typography-label text-hierarchy-title">{t('checkout.deliveryCharge')}</p>
                            <p className="typography-micro truncate text-muted-foreground">
                              {formik.values.district?.trim() ? getDeliveryType() : t('checkout.calculatedBasedOnDistrict')}
                            </p>
                          </div>
                          <span className="font-price typography-label shrink-0 text-hierarchy-title">
                            {formatEuroCurrency(shipping)}
                          </span>
                        </div>
                      </div>
                    </Panel>

                    <Panel title={t('checkout.paymentMethod')} icon={CreditCard}>
                      <RadioGroup
                        value={formik.values.method}
                        onValueChange={(value) => formik.setFieldValue('method', value)}
                        className="space-y-3"
                      >
                        {paymentSettings.codEnabled && (
                          <Label
                            htmlFor="cod"
                            className={cn(
                              'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition-colors',
                              formik.values.method === 'cod'
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/40'
                            )}
                          >
                            <RadioGroupItem value="cod" id="cod" />
                            <span className="min-w-0 flex-1">
                              <span className="block typography-label text-hierarchy-title">{t('checkout.cashOnDelivery')}</span>
                              <span className="block typography-micro text-muted-foreground">{t('checkout.payWhenYouReceiveYourOrder')}</span>
                            </span>
                            <Truck size={18} className="shrink-0 text-muted-foreground" />
                          </Label>
                        )}

                        {paymentSettings.isPaymentGatewayEnabled && (
                          <Label
                            htmlFor="sslcommerz"
                            className={cn(
                              'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition-colors',
                              formik.values.method === 'sslcommerz'
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/40'
                            )}
                          >
                            <RadioGroupItem value="sslcommerz" id="sslcommerz" />
                            <span className="min-w-0 flex-1">
                              <span className="block typography-label text-hierarchy-title">{t('checkout.onlinePayment')}</span>
                              <span className="block typography-micro text-muted-foreground">{t('checkout.paySecurelyWithCreditDebitCard')}</span>
                            </span>
                            <CreditCard size={18} className="shrink-0 text-muted-foreground" />
                          </Label>
                        )}
                      </RadioGroup>
                      {displayErrors.method && (
                        <p className={fieldErrorClass}>{displayErrors.method}</p>
                      )}
                    </Panel>
                  </>
                )}

                {/* Step 2: Order Review */}
                {currentStep === 2 && (
                  <>
                    <Panel title={t('checkout.orderItems')} icon={CheckCircle}>
                      <ul className="-my-3 divide-y divide-border">
                        {/* A free-gift deal can grant a product the cart already
                            holds, so id + variant is not unique: the paid line
                            and the gift line collided on one key and React
                            rendered a single, wrong row. The index disambiguates
                            them. */}
                        {items.map((item, index) => (
                          <li
                            key={`${item.id}-${item.variant ?? ''}-${index}`}
                            className="flex items-center gap-3 py-3 sm:gap-4"
                          >
                            <div className="relative shrink-0">
                              <div className="h-14 w-14 overflow-hidden rounded-lg border border-border bg-muted">
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <QuantityBadge quantity={item.quantity} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate typography-label text-hierarchy-title">{item.name}</p>
                              {/* One line, one price — the composition is shown
                                  as a note beneath it so the review still says
                                  what is inside the box. */}
                              {item.itemType === 'combo_bundle' ? (
                                <p className="truncate typography-micro text-muted-foreground">
                                  {t(
                                    item.comboType === 'bundle'
                                      ? 'combos.badge.bundle'
                                      : 'combos.badge.combo'
                                  )}
                                  {item.components?.length
                                    ? ` · ${item.components
                                        .map((component) => `${component.name} ×${component.qty}`)
                                        .join(', ')}`
                                    : ''}
                                </p>
                              ) : null}
                              <p className="truncate typography-micro text-muted-foreground">
                                {item.variant ? `${item.variant} · ` : ''}
                                {item.isGift
                                  ? t('common.qtyOnly', { qty: item.quantity })
                                  : t('common.qtyTimesPrice', {
                                      qty: item.quantity,
                                      price: formatEuroCurrency(item.price)
                                    })}
                              </p>
                            </div>

                            <div className="shrink-0 text-right">
                              {item.isGift ? (
                                <>
                                  <p className="font-price typography-label text-hierarchy-title">{t('cart.deals.free')}</p>
                                  {item.listPrice ? (
                                    <p className="font-price typography-micro text-muted-foreground line-through">
                                      {formatEuroCurrency(item.listPrice)}
                                    </p>
                                  ) : null}
                                </>
                              ) : (
                                <p className="font-price typography-label text-hierarchy-title">
                                  {formatEuroCurrency(item.price * item.quantity)}
                                </p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </Panel>

                    <Panel
                      title={t('checkout.deliveryAndPayment')}
                      icon={Truck}
                      action={
                        <Button
                          variant="ghost-secondary"
                          size="sm"
                          onClick={() => setCurrentStep(1)}
                        >
                          {t('checkout.edit')}
                        </Button>
                      }
                    >
                      <dl className="space-y-3">
                        <SummaryRow
                          label={t('checkout.name')}
                          value={`${formik.values.firstName} ${formik.values.lastName}`.trim()}
                        />
                        {formik.values.email ? (
                          <SummaryRow label={t('checkout.email')} value={formik.values.email} />
                        ) : null}
                        <SummaryRow label={t('checkout.phone2')} value={formik.values.phone} />
                        <SummaryRow label={t('checkout.deliveringTo')} value={formattedAddress} />
                        <SummaryRow
                          label={t('checkout.paymentMethod2')}
                          value={formik.values.method === 'cod' ? t('checkout.cashOnDelivery') : t('checkout.onlinePayment')}
                        />
                        <SummaryRow label={t('checkout.deliveryArea')} value={getDeliveryType()} />
                      </dl>
                    </Panel>

                    <Panel title={t('checkout.orderNotesOptional')} icon={Tag}>
                      <Textarea
                        id="notes"
                        {...formik.getFieldProps('notes')}
                        placeholder={t('checkout.anySpecialInstructionsForYourOrder')}
                        rows={3}
                      />
                      {displayErrors.notes && (
                        <p className={fieldErrorClass}>{displayErrors.notes}</p>
                      )}
                    </Panel>
                  </>
                )}
              </div>
            </div>

            {/* Action rail — pinned to the bottom of the panel on desktop */}
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between lg:mt-4 lg:border-t lg:border-border lg:pt-4">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                size="lg"
                className="gap-2"
              >
                <ArrowLeft size={16} />
                {t('checkout.previous')}
              </Button>

              {currentStep < TOTAL_STEPS ? (
                <Button onClick={nextStep} size="lg" className="gap-2 sm:min-w-[12rem]">
                  {t('checkout.next')}
                  <ArrowRight size={16} />
                </Button>
              ) : (
                <Button
                  onClick={placeOrder}
                  disabled={loading}
                  size="lg"
                  className="gap-2 sm:min-w-[12rem]"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      {t('checkout.placingOrder')}
                    </>
                  ) : (
                    <>
                      <Lock size={15} />
                      {t('checkout.placeOrder')}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* ── Order summary: fixed on desktop ── */}
          <aside className="custom-scrollbar order-1 lg:order-2 lg:max-h-full lg:overflow-y-auto">
            <div className="rounded-2xl border border-border bg-card">
              <header className="border-b border-border px-5 py-4 sm:px-6">
                <h2 className="typography-card-title text-hierarchy-title">{t('checkout.orderSummary')}</h2>
              </header>

              <div className="space-y-4 px-5 py-5 sm:px-6">
                <dl className="space-y-2.5">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="typography-caption text-muted-foreground" suppressHydrationWarning>
                      {hasHydrated
                        ? t('checkout.itemsWithCount', { count: itemCount })
                        : t('checkout.items0')}
                    </dt>
                    <dd className="font-price typography-label text-hierarchy-title" suppressHydrationWarning>
                      {formatEuroCurrency(hasHydrated ? subtotal : 0)}
                    </dd>
                  </div>

                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="typography-caption text-muted-foreground">{t('checkout.shipping')}</dt>
                    <dd className="font-price typography-label text-hierarchy-title">{formatEuroCurrency(shipping)}</dd>
                  </div>

                  {hasHydrated && dealDiscount > 0 && (
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="typography-caption text-muted-foreground">{t('cart.deals.discountLabel')}</dt>
                      <dd className="font-price typography-label text-hierarchy-title" suppressHydrationWarning>
                        -{formatEuroCurrency(dealDiscount)}
                      </dd>
                    </div>
                  )}

                  {hasHydrated && discount > 0 && (
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="typography-caption text-muted-foreground">{t('checkout.discount')}</dt>
                      <dd className="font-price typography-label text-hierarchy-title" suppressHydrationWarning>
                        -{formatEuroCurrency(discount)}
                      </dd>
                    </div>
                  )}
                </dl>

                <div className="flex items-baseline justify-between gap-4 border-t border-border pt-4">
                  <span className="typography-label text-hierarchy-title">{t('checkout.total')}</span>
                  <span className="font-price typography-card-title text-hierarchy-title" suppressHydrationWarning>
                    {formatEuroCurrency(hasHydrated ? finalTotal : shipping)}
                  </span>
                </div>

                {/* Promo code */}
                <div className="border-t border-border pt-4">
                  {hasHydrated && appliedCoupon ? (
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <Tag size={15} className="shrink-0 text-muted-foreground" />
                        <span className="truncate typography-label text-hierarchy-title">{appliedCoupon}</span>
                      </span>
                      <Button
                        variant="ghost-secondary"
                        size="sm"
                        onClick={() => dispatch(removeCoupon())}
                      >
                        {t('checkout.remove')}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Label htmlFor="couponCode" className={fieldLabelClass}>{t('checkout.promoCode')}</Label>
                      <div className="flex gap-2">
                        <Input
                          id="couponCode"
                          placeholder={t('checkout.enterCouponCode')}
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          onClick={handleCouponApply}
                          disabled={couponLoading || !couponCode.trim()}
                        >
                          {couponLoading ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            t('checkout.apply')
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                <p className="flex items-center justify-center gap-2 border-t border-border pt-4 typography-micro text-muted-foreground">
                  <Lock size={13} />
                  {t('checkout.secureCheckout')}
                </p>
              </div>
            </div>
          </aside>
        </div>
        </main>
      </div>

      {/* Error Dialog */}
      <ErrorDialogComponent />

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
