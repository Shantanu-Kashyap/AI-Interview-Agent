import React, { useState } from "react";
import { FaArrowLeft, FaCheckCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useDispatch } from "react-redux";
import { setUserData } from "../redux/userSlice";
import { showApiError } from "../utils/errorHandler";
import { showSuccessToast } from "../utils/toast";
import apiClient from "../utils/apiClient";


const Pricing = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [selectedPlan, setSelectedPlan] = useState("free");
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [referralCode, setReferralCode] = useState("");
  const [applyingReferral, setApplyingReferral] = useState(false);

  const plans = [
    {
      id: "free",
      name: "Free",
      price: "₹0",
      credits: 100,
      description: "Perfect for beginners starting interview preparation.",
      features: [
        "100 AI Interview Credits",
        "Basic Performance Report",
        "Voice Interview Access",
        "Limited History Tracking",
      ],
      default: true,
    },
    {
      id: "basic",
      name: "Starter Pack",
      price: "₹100",
      credits: 150,
      description: "Ideal for regular practice and feedback.",
      features: [
        "150 AI Interview Credits",
        "Detailed Feedback",
        "Performance Analytics",
        "Full Interview History",
      ],
    },

    {
      id: "pro",
      name: "Pro Pack",
      price: "₹500",
      credits: 650,
      planType: "credits",
      description: "Best value for serious job preparation.",
      features: [
        "650 AI Interview Credits",
        "Advanced AI Feedback",
        "Skill Trend Analysis",
        "Priority AI Processing",
      ],
      badge: "Best Value",
    },
    {
      id: "starter-monthly",
      name: "Starter Monthly",
      price: "₹199",
      credits: 250,
      planType: "subscription",
      durationDays: 30,
      description: "Monthly plan with recurring practice momentum.",
      features: [
        "250 Credits instantly",
        "30-day active subscription",
        "Priority support queue",
        "Full analytics access",
      ],
      badge: "Subscription",
    },
    {
      id: "pro-monthly",
      name: "Pro Monthly",
      price: "₹399",
      credits: 500,
      planType: "subscription",
      durationDays: 30,
      description: "For consistent interview prep with advanced reporting.",
      features: [
        "500 Credits instantly",
        "30-day premium subscription",
        "Advanced report insights",
        "Priority AI processing",
      ],
      badge: "Most Popular",
    },
  ];

  const handlePayment = async (plan) => {
    try {
      setLoadingPlan(plan.id);
      const amountMap = {
        basic: 100,
        pro: 500,
        "starter-monthly": 199,
        "pro-monthly": 399,
      };
      const amount = amountMap[plan.id] || 0;

      const result = await apiClient.post(
        "/api/payment/order",
        {
          planId: plan.id,
          amount,
          credits: plan.credits,
          planType: plan.planType || "credits",
          durationDays: plan.durationDays || 0,
        },
      );

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: result.data.amount,
        currency: "INR",
        name: "InterviewIQ.AI",
        description: `${plan.name} - ${plan.credits} Credits`,
        order_id: result.data.id,
        handler: async function (response) {
          try {
            const verifyResult = await apiClient.post(
              "/api/payment/verify",
              {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              },
            );
            dispatch(setUserData(verifyResult.data.user));
            showSuccessToast("Payment successful. Credits were added to your account.", {
              actionLabel: "Go to Interview",
              onAction: () => navigate("/interview"),
            });
            navigate("/");
          } catch (err) {
            showApiError(err, "Payment verification failed. Please contact support.");
          }
        },
        theme: { color: "#059669" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      showApiError(error, "Failed to initiate payment. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleApplyReferral = async () => {
    try {
      setApplyingReferral(true);
      const res = await apiClient.post("/api/auth/apply-referral", { referralCode });
      dispatch(setUserData(res.data.user));
      showSuccessToast("Referral applied successfully. Bonus credits added.");
      setReferralCode("");
    } catch (error) {
      showApiError(error, "Unable to apply referral code.");
    } finally {
      setApplyingReferral(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50 py-16 px-6">
      <div className="max-w-6xl mx-auto mb-14 flex items-start gap-4">
        <button
          onClick={() => navigate("/")}
          className="mt-2 p-3 rounded-full bg-white shadow hover:shadow-md transition"
        >
          <FaArrowLeft className="text-gray-600" />
        </button>

        <div className="text-center w-full">
          <h1 className="text-4xl font-bold text-gray-800">Choose Your Plan</h1>

          <p className="text-gray-500 mt-3 text-lg">
            Flexible pricing to match your interview preparation goals.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto mb-10 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800">Have a referral code?</h3>
        <p className="text-sm text-gray-500 mt-1">Apply and get bonus interview credits.</p>
        <div className="mt-4 flex gap-2">
          <input
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            placeholder="Enter referral code"
            className="flex-1 rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
          />
          <button
            onClick={handleApplyReferral}
            disabled={!referralCode.trim() || applyingReferral}
            className="rounded-xl bg-black px-4 py-3 text-white font-semibold disabled:opacity-50"
          >
            {applyingReferral ? "Applying..." : "Apply"}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => {
          const isSelected = selectedPlan === plan.id;

          return (
            <motion.div
              key={plan.id}
              whileHover={!plan.default && { scale: 1.03 }}
              onClick={() => !plan.default && setSelectedPlan(plan.id)}
              className={`relative rounded-3xl p-8 transition-all duration-300 border
                      ${
                        isSelected
                          ? "border-emerald-600 shadow-2xl bg-white"
                          : "border-gray-200 bg-white shadow-md"
                      }
                      ${plan.default ? "cursor-default" : "cursor-pointer"}
                      `}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute top-6 right-6 bg-emerald-600 text-white text-xs px-4 py-1 rounded-full shadow">
                  {plan.badge}
                </div>
              )}

              {/* Default Tag */}
              {plan.default && (
                <div className="absolute top-6 right-6 bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">
                  Default
                </div>
              )}

              {/* Plan Name */}
              <h3 className="text-xl font-semibold text-gray-800">
                {plan.name}
              </h3>

              {/* Price */}
              <div className="mt-4">
                <span className="text-3xl font-bold text-emerald-600">
                  {plan.price}
                </span>
                <p className="text-gray-500 mt-1">{plan.credits} Credits</p>
              </div>

              {/* Description */}
              <p className="text-gray-500 mt-4 text-sm leading-relaxed">
                {plan.description}
              </p>

              {/* Features */}
              <div className="mt-6 space-y-3 text-left">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <FaCheckCircle className="text-emerald-500 text-sm" />
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </div>
                ))}

                {!plan.default && (
                  <button
                    disabled={loadingPlan === plan.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isSelected) {
                        setSelectedPlan(plan.id);
                      } else {
                        handlePayment(plan);
                      }
                    }}
                    className={`w-full mt-8 py-3 rounded-xl font-semibold transition ${
                      isSelected
                        ? "bg-emerald-600 text-white hover:opacity-90"
                        : "bg-gray-100 text-gray-700 hover:bg-emerald-50"
                    }`}
                  >
                    {loadingPlan === plan.id
                      ? "Processing..."
                      : isSelected
                        ? "Proceed to Pay"
                        : "Select Plan"}

                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Pricing;
