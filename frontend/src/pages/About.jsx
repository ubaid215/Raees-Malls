import React from 'react';
import { FiShoppingBag, FiGlobe, FiShield } from 'react-icons/fi';
import Card from '../components/core/Card';
import Button from '../components/core/Button';

const About = () => {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">About Raees Malls</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Your trusted destination for premium mobile accessories and imported products
          </p>
        </div>
      </section>

      {/* About Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
            <p className="text-gray-600 mb-4">
              Established in Jaranwala, Raees Malls has been serving customers with top-quality mobile accessories since our inception. 
              We take pride in offering only the best products to our valued customers.
            </p>
            <p className="text-gray-600 mb-6">
              Specializing in imported mobile accessories, we bring global quality to your doorstep. Our carefully curated selection 
              ensures you get durable, stylish, and functional products at competitive prices.
            </p>
            <Button variant="primary" as="a" href="/products">
              Explore Our Products
            </Button>
          </div>
          <div className="rounded-lg overflow-hidden shadow-lg">
            <img 
              src="/store-interior.jpg" 
              alt="Raees Malls Store" 
              className="w-full h-auto object-cover"
            />
          </div>
        </div>

        {/* Values */}
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Why Choose Us</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="p-6 text-center">
            <div className="text-red-600 mb-4 flex justify-center">
              <FiShoppingBag size={32} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Wide Selection</h3>
            <p className="text-gray-600">
              Hundreds of products from top international brands to meet all your mobile accessory needs
            </p>
          </Card>

          <Card className="p-6 text-center">
            <div className="text-red-600 mb-4 flex justify-center">
              <FiGlobe size={32} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Imported Quality</h3>
            <p className="text-gray-600">
              We source directly from manufacturers worldwide to ensure authentic, high-quality products
            </p>
          </Card>

          <Card className="p-6 text-center">
            <div className="text-red-600 mb-4 flex justify-center">
              <FiShield size={32} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Customer Trust</h3>
            <p className="text-gray-600">
              Building relationships since day one with honest business practices and reliable products
            </p>
          </Card>
        </div>
      </section>

      {/* Location */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Visit Us</h2>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-xl font-semibold mb-4">Our Location</h3>
              <p className="text-gray-600 mb-6">
                Masjid Bazar Opposite Jamia Masjid<br />
                Jaranwala, Pakistan
              </p>
              <Button variant="outline" as="a" href="/contact">
                Get Directions
              </Button>
            </div>
            <div className="h-64 md:h-96 bg-gray-200 rounded-lg overflow-hidden">
              {/* Embedded Google Map */}
              <iframe 
                title="Raees Malls Location"
                width="100%" 
                height="100%" 
                frameBorder="0" 
                scrolling="no" 
                marginHeight="0" 
                marginWidth="0" 
                src="https://maps.google.com/maps?q=Masjid+Bazar+Opposite+Jamia+Masjid+Jaranwala&output=embed"
              ></iframe>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;