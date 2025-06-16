import React from "react";
import { motion } from "framer-motion";
import { Phone, Mail, Loader2 } from "lucide-react";

const Button = ({
  children,
  variant = "primary",
  size = "medium",
  isLoading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon,
  className = "",
  as: Component = "button", // Support polymorphic rendering
  ...props
}) => {
  const variantStyles = {
    primary: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-500",
    outline: "border border-red-300 hover:bg-red-50 py-2 px-3 text-gray-700 focus:ring-red-500",
    ghost: "hover:bg-gray-100 text-gray-700 focus:ring-red-500",
    danger: "bg-red-500 hover:bg-red-600 py-1 px-2 text-white focus:ring-red-500",
  };

  const sizeStyles = {
    small: "px-3 py-2 text-sm",
    medium: "px-4 py-2 text-base",
    large: "px-6 py-3 text-lg",
  };

  return (
    <>
      <style>{`
        @keyframes vibrate {
          0% { transform: translate(0, 0) rotate(0deg); }
          20% { transform: translate(3px, 1px) rotate(0.7deg); }
          40% { transform: translate(-1px, -2px) rotate(-0.7deg); }
          60% { transform: translate(1px, -1px) rotate(0.7deg); }
          80% { transform: translate(-2px, 1px) rotate(-0.7deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        .vibrate-on-hover:hover {
          animation: vibrate 0.5s ease-in-out;
        }
      `}</style>
      <Component
        className={`
          rounded-md font-medium transition-colors
          focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:opacity-70 disabled:cursor-not-allowed
          flex items-center justify-center gap-2
          ${fullWidth ? "w-full" : "w-auto"}
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          vibrate-on-hover
          ${className}
        `}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin h-5 w-5" />
            <span>Loading...</span>
          </>
        ) : (
          <>
            {Icon && <Icon className="h-5 w-5" />}
            {children}
          </>
        )}
      </Component>
    </>
  );
};

const Card = ({ children, className = "" }) => (
  <div
    className={`bg-white rounded-lg shadow-lg p-6 transition-transform duration-300 hover:shadow-xl hover:-translate-y-1 ${className}`}
  >
    {children}
  </div>
);

const PrivacyPolicy = () => {
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };
  const staggerChildren = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2 } },
  };

  return (
    <div className="bg-gray-50">
      <motion.section
        className="relative bg-gradient-to-r from-red-600 to-red-800 py-20 overflow-hidden"
        initial="hidden"
        animate="visible"
        variants={staggerChildren}
      >
        <div
          className="absolute inset-0 bg-pattern opacity-10"
          style={{ backgroundImage: "url(/pattern.png)" }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1
            className="text-4xl sm:text-5xl font-extrabold text-white mb-4"
            variants={fadeInUp}
          >
            Privacy Policy
          </motion.h1>
          <motion.p
            className="text-lg sm:text-xl text-red-100 max-w-3xl mx-auto mb-8"
            variants={fadeInUp}
          >
            Your Privacy, Our Priority: Unveiling the Shield on Your Information
            Security
          </motion.p>
        </div>
      </motion.section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerChildren}
        >
          <motion.h2
            className="text-2xl font-semibold text-gray-900 mb-4"
            variants={fadeInUp}
          >
            Policy Brief & Purpose
          </motion.h2>
          <motion.p className="text-lg text-gray-600" variants={fadeInUp}>
            At Raees Malls, we are committed to safeguarding the data of our
            employees, stakeholders, customers, and other parties. We ensure
            that collected data is stored securely and used only when necessary,
            maintaining confidentiality with utmost assurance.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerChildren}
        >
          <motion.h2
            className="text-2xl font-semibold text-gray-900 mb-4"
            variants={fadeInUp}
          >
            Scope
          </motion.h2>
          <motion.p className="text-lg text-gray-600" variants={fadeInUp}>
            This policy applies to all associates, including employees, job
            candidates, customers, partners, contractors, consultants, and
            consumers. Protecting their provided records is our top priority.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerChildren}
        >
          <motion.h2
            className="text-2xl font-semibold text-gray-900 mb-4"
            variants={fadeInUp}
          >
            Who Is Covered?
          </motion.h2>
          <motion.p className="text-lg text-gray-600 mb-4" variants={fadeInUp}>
            This policy primarily guides our employees to adhere to privacy
            terms but extends to all connected parties, including:
          </motion.p>
          <motion.ul
            className="list-disc pl-6 text-lg text-gray-600 space-y-2"
            variants={fadeInUp}
          >
            <li>Partners</li>
            <li>Contractors</li>
            <li>Consultants</li>
            <li>Outsider individuals</li>
            <li>Consumers</li>
          </motion.ul>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerChildren}
        >
          <motion.h2
            className="text-2xl font-semibold text-gray-900 mb-4"
            variants={fadeInUp}
          >
            Policy Elements
          </motion.h2>
          <motion.p className="text-lg text-gray-600 mb-4" variants={fadeInUp}>
            We collect information such as names, usernames, addresses,
            passwords, digital footprints, financial data, and photographs for
            identification purposes, with the consent of the parties involved.
            This data is highly confidential and securely stored.
          </motion.p>
          <motion.div className="space-y-4" variants={fadeInUp}>
            <h3 className="text-lg font-semibold text-gray-800">
              Our Data Will Be:
            </h3>
            <p className="text-lg text-gray-600">
              Collected in compliance with company policies for lawful use,
              protected by a robust security network to prevent unauthorized
              access.
            </p>
            <h3 className="text-lg font-semibold text-gray-800">
              Our Data Will Not Be:
            </h3>
            <ul className="list-disc pl-6 text-lg text-gray-600 space-y-2">
              <li>Used in informal communication.</li>
              <li>Recorded excessively without limits.</li>
              <li>
                Shared with organizations or countries lacking data protection
                policies.
              </li>
              <li>
                Provided to unauthorized parties, except for legitimate law
                enforcement requests.
              </li>
            </ul>
          </motion.div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerChildren}
        >
          <motion.h2
            className="text-2xl font-semibold text-gray-900 mb-4"
            variants={fadeInUp}
          >
            Company Data Responsibility
          </motion.h2>
          <motion.p className="text-lg text-gray-600" variants={fadeInUp}>
            Raees Malls is accountable for protecting collected data, informing
            individuals about its use, and allowing data owners to access or
            modify their information upon request.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerChildren}
        >
          <motion.h2
            className="text-2xl font-semibold text-gray-900 mb-4"
            variants={fadeInUp}
          >
            Actions
          </motion.h2>
          <motion.ul
            className="list-disc pl-6 text-lg text-gray-600 space-y-2"
            variants={fadeInUp}
          >
            <li>Restrict access to authorized personnel only.</li>
            <li>Develop systems for accurate data collection.</li>
            <li>Train employees on online privacy and security.</li>
            <li>
              Implement network security to protect against cyber-attacks.
            </li>
            <li>Use contract clauses to outline data protection measures.</li>
            <li>
              Employ data protection activities like shredding, secure locks,
              encryption, and frequent backups.
            </li>
          </motion.ul>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerChildren}
        >
          <motion.h2
            className="text-2xl font-semibold text-gray-900 mb-4"
            variants={fadeInUp}
          >
            Disciplinary Consequences
          </motion.h2>
          <motion.p className="text-lg text-gray-600" variants={fadeInUp}>
            Non-compliance with this policy will result in disciplinary actions
            against any illegal activities, ensuring strict adherence to our
            guidelines.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerChildren}
        >
          <motion.h2
            className="text-2xl font-semibold text-gray-900 mb-4"
            variants={fadeInUp}
          >
            Copyrights
          </motion.h2>
          <motion.p className="text-lg text-gray-600 mb-4" variants={fadeInUp}>
            All content on Raees Malls, including mobile phone prices, photos,
            and other information, is our property and protected by copyright.
            Unauthorized use or imitation is prohibited, and violators risk
            termination of their shopping subscription. Any attempt to modify
            our interface or hack our database will face legal action.
          </motion.p>
          <motion.p
            className="text-sm text-gray-500 italic"
            variants={fadeInUp}
          >
            Note: Displayed information may occasionally be outdated. Contact
            our customer support for the latest updates.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerChildren}
        >
          <motion.h2
            className="text-2xl font-semibold text-gray-900 mb-4"
            variants={fadeInUp}
          >
            Contact Us
          </motion.h2>
          <motion.div className="space-y-4" variants={fadeInUp}>
            <p className="text-lg text-gray-600 flex items-center">
              <Phone className="text-red-600 mr-2" size={20} />
              <a
                href="tel:+923006530063"
                className="text-red-600 hover:underline"
              >
                +923006530063
              </a>
            </p>
            <p className="text-lg text-gray-600 flex items-center">
              <Mail className="text-red-600 mr-2" size={20} />
              <a
                href="mailto:raeesmalls1@gmail.com"
                className="text-red-600 hover:underline"
              >
                raeesmalls1@gmail.com
              </a>
            </p>
            <Button
              variant="outline"
              size="medium"
              as="a"
              href="https://wa.me/923006530063?text=Hello%20Raees%20Malls%20Support"
              target="_blank"
              rel="noopener noreferrer"
            >
              Chat on WhatsApp
            </Button>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;