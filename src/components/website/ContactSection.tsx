'use client';

import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageSquare, CheckCircle2, Sparkles, ArrowRight, Instagram, Linkedin } from 'lucide-react';

export function ContactSection() {
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    email: '',
    phone: '',
    services: [] as string[],
    budget: '',
    message: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableServices = [
    'Short-Form Video (Reels/TikTok)',
    'Full-Stack Social Management',
    'Brand Docu-Series Storytelling',
    'Phone Videography Masterclass',
    'Multi-City Retainer (Kampala & Nairobi)',
  ];

  const budgetRanges = [
    'Starter Sprint',
    'Standard Growth Engine',
    'Enterprise Studio Retainer',
    'Custom Scope',
  ];

  const handleToggleService = (service: string) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter((s) => s !== service)
        : [...prev.services, service],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate instantaneous submission feedback
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <section id="contact" className="py-24 bg-[#151216] relative overflow-hidden">
      {/* Red ambient lighting */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-red-700/10 blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#E50914] text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-950/40">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Initiate Your Campaign</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black text-white tracking-tight">
            LET’S MAKE YOUR BRAND{' '}
            <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-400 to-red-600">
              UNMISSABLE.
            </span>
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
            Ready to stop losing customers to competitors who shoot better videos? Fill out the brief below or ping us directly on WhatsApp for an immediate discovery call.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Direct Contacts & Studio Info */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* Quick WhatsApp Action Box */}
            <div className="p-8 rounded-3xl bg-gradient-to-br from-red-950/70 via-[#261f28] to-[#1c1720] border-2 border-red-600/50 shadow-2xl relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-serif">
                    Fast-Track on WhatsApp
                  </h3>
                  <p className="text-[11px] text-zinc-400">Average response time: &lt; 20 mins</p>
                </div>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed mb-6">
                Have an urgent shoot deadline or want to speak directly to our creative director? Chat with us instantly.
              </p>
              <a
                href="https://wa.me/256700000000?text=Hi%20Koko%20Digital,%20I'd%20like%20to%20discuss%20a%20video%20production%20or%20social%20media%20project%20for%20my%20brand."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold shadow-lg shadow-red-700/40 flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <span>Chat on Studio WhatsApp</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            {/* Studio Locations */}
            <div className="space-y-4">
              <div className="p-6 rounded-3xl bg-[#221d25] border border-[#362d3a] flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-red-600/15 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white font-serif">Kampala Studio HQ</h4>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                    Kampala, Uganda • Content shoots across Kololo, Nakasero, Bugolobi & Greater Kampala.
                  </p>
                  <p className="text-[11px] text-red-400 mt-1 font-mono">Mon – Sat: 8:30 AM – 7:00 PM</p>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-[#221d25] border border-[#362d3a] flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-red-600/15 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white font-serif">Nairobi Creative Hub</h4>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                    Nairobi, Kenya • Regional expansion production squad & East African brand campaigns.
                  </p>
                  <p className="text-[11px] text-red-400 mt-1 font-mono">By Appointment</p>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-[#221d25] border border-[#362d3a] flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-red-600/15 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white font-serif">Direct Email</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    For proposals, RFP submissions, and partnerships:
                  </p>
                  <a
                    href="mailto:kokodigitalstudios@gmail.com"
                    className="text-xs font-bold text-red-400 hover:text-red-300 underline mt-1 inline-block"
                  >
                    kokodigitalstudios@gmail.com
                  </a>
                </div>
              </div>

              {/* Connected Social Media Channels */}
              <div className="p-6 rounded-3xl bg-[#221d25] border border-[#362d3a] flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-red-600/15 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="w-full">
                  <h4 className="text-sm font-bold text-white font-serif">Official Social Channels</h4>
                  <p className="text-xs text-zinc-400 mt-0.5 mb-3">
                    Watch our latest client campaigns, viral reels, and studio BTS:
                  </p>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
                    <a
                      href="https://www.instagram.com/koko_digital_studio/?hl=en"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-[#2b2430] hover:bg-red-600/20 border border-[#3e3445] hover:border-red-500 text-[11px] font-bold text-zinc-200 hover:text-white flex items-center gap-1.5 transition-all"
                    >
                      <Instagram className="w-3.5 h-3.5 text-red-400" />
                      <span>Instagram</span>
                    </a>
                    <a
                      href="https://www.tiktok.com/@koko_digital_studios"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-[#2b2430] hover:bg-red-600/20 border border-[#3e3445] hover:border-red-500 text-[11px] font-bold text-zinc-200 hover:text-white flex items-center gap-1.5 transition-all"
                    >
                      <span className="text-red-400 font-black text-xs">TT</span>
                      <span>TikTok</span>
                    </a>
                    <a
                      href="https://www.linkedin.com/company/koko-digital-studios/home/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-[#2b2430] hover:bg-red-600/20 border border-[#3e3445] hover:border-red-500 text-[11px] font-bold text-zinc-200 hover:text-white flex items-center gap-1.5 transition-all"
                    >
                      <Linkedin className="w-3.5 h-3.5 text-red-400" />
                      <span>LinkedIn</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Interactive Project Brief Form */}
          <div className="lg:col-span-7">
            <div className="p-8 sm:p-10 rounded-3xl bg-[#221d25] border border-[#362d3a] shadow-2xl relative">
              
              {submitted ? (
                <div className="py-12 text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="w-16 h-16 rounded-3xl bg-red-600/20 border-2 border-red-500 text-red-400 flex items-center justify-center mx-auto shadow-xl shadow-red-950/40">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black text-white font-heading">
                    Project Brief Received!
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-300 max-w-md mx-auto leading-relaxed">
                    Thank you for reaching out to Koko Digital Studio. Our creative director is reviewing your brand brief and will reach out via WhatsApp/Email within 24 hours.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({
                        name: '',
                        brand: '',
                        email: '',
                        phone: '',
                        services: [],
                        budget: '',
                        message: '',
                      });
                    }}
                    className="mt-4 px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200"
                  >
                    Send Another Project Brief
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-white font-heading mb-1">
                      Start Your Project Brief
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Tell us about your brand and what you want to achieve.
                    </p>
                  </div>

                  {/* Name and Brand */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-300">
                        Your Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Elijah Kasumba"
                        className="w-full px-4 py-3 rounded-xl bg-[#2b2430] border border-[#3e3445] text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-300">
                        Brand / Business Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        placeholder="e.g. Névo Café"
                        className="w-full px-4 py-3 rounded-xl bg-[#2b2430] border border-[#3e3445] text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Email and Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-300">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="you@company.com"
                        className="w-full px-4 py-3 rounded-xl bg-[#2b2430] border border-[#3e3445] text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-300">
                        WhatsApp / Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+256 700 000 000"
                        className="w-full px-4 py-3 rounded-xl bg-[#2b2430] border border-[#3e3445] text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Services Multi-Select */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-300">
                      What Services Are You Looking For?
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableServices.map((service) => {
                        const isSelected = formData.services.includes(service);
                        return (
                          <button
                            type="button"
                            key={service}
                            onClick={() => handleToggleService(service)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              isSelected
                                ? 'bg-red-600 text-white shadow-md shadow-red-700/30'
                                : 'bg-[#2b2430] text-zinc-300 hover:text-white border border-[#3e3445]'
                            }`}
                          >
                            {service}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Target Scope / Budget Range */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-300">
                      Estimated Project Scope / Budget
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {budgetRanges.map((b) => (
                        <button
                          type="button"
                          key={b}
                          onClick={() => setFormData({ ...formData, budget: b })}
                          className={`p-2.5 rounded-xl text-center text-xs font-semibold border transition-all ${
                            formData.budget === b
                              ? 'bg-red-950/60 border-red-500 text-red-300'
                              : 'bg-[#2b2430] border-[#3e3445] text-zinc-300 hover:border-zinc-500'
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Project Vision Message */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">
                      Tell Us About Your Goals & Target Audience
                    </label>
                    <textarea
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="e.g. We are launching a new weekend brunch menu next month and want 12 aesthetic reels and full TikTok management to drive foot-traffic..."
                      className="w-full px-4 py-3 rounded-xl bg-[#2b2430] border border-[#3e3445] text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-red-600 via-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-xl shadow-red-700/40 hover:shadow-red-600/60 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Submitting Brief...
                      </span>
                    ) : (
                      <>
                        <span>Submit Project Brief to Koko Digital</span>
                        <Send className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-zinc-500 text-center">
                    🔒 We respect your privacy. No spam. Direct response from our creative directors.
                  </p>
                </form>
              )}

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
