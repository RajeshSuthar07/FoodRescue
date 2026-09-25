import { Link } from 'react-router-dom';
import { HandHeart, Building2, Navigation, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-50 via-brand-50/40 to-transparent -z-10" />
        <div className="max-w-5xl mx-auto px-4 py-20 md:py-28 text-center">
          <span className="inline-block bg-brand-100 text-brand-800 text-xs font-semibold px-3 py-1 rounded-full mb-5">
            Reducing food waste, one delivery at a time
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight leading-tight">
            Rescue surplus food. <br className="hidden md:block" />
            <span className="text-brand-600">Feed people in need.</span>
          </h1>
          <p className="mt-5 text-lg text-gray-600 max-w-2xl mx-auto">
            FoodRescue connects donors with surplus food to NGOs and shelters across India —
            with real-time GPS tracking of every pickup and delivery, from your kitchen to their table.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <Link
              to="/register"
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium shadow-sm transition-colors"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 rounded-lg border border-gray-300 hover:bg-white text-gray-700 font-medium transition-colors"
            >
              Log In
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-24 grid md:grid-cols-3 gap-6">
        {[
          {
            icon: HandHeart,
            title: 'Donors',
            desc: 'List surplus food in minutes, pin the pickup spot on the map, and track its journey to those who need it.',
            color: 'text-brand-600 bg-brand-50',
          },
          {
            icon: Building2,
            title: 'NGOs',
            desc: 'Discover nearby available food the moment it\u2019s listed and request pickup instantly.',
            color: 'text-sky-600 bg-sky-50',
          },
          {
            icon: Navigation,
            title: 'Live GPS Tracking',
            desc: 'Watch the real vehicle location on the map — no simulations, real device GPS every step of the way.',
            color: 'text-indigo-600 bg-indigo-50',
          },
        ].map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
