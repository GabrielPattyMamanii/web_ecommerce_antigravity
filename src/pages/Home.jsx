import React from 'react';
import Hero from '../components/Hero';
import FeaturedProducts from '../components/FeaturedProducts';

const Home = () => {
    return (
        <>
            <Hero />
            <FeaturedProducts />
            {/* Additional sections can be added here, e.g., Newsletter, Categories */}
        </>
    );
};

export default Home;
