import React, { useEffect, useState } from 'react';
import Odometer from 'react-odometerjs';

export default function DashboardOdometer() {
    const [value, setValue] = useState(0);

    useEffect(() => {
        const timeoutId = setTimeout(() => setValue(4321), 2000);
        return () => {
            clearTimeout(timeoutId);
        };
    }, []);

    return <Odometer value={value} className='font-mono text-xl' format="(.ddd),dd" />;
}