// server/routes/proxy.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const Sharp = require('sharp');
const path = require('path');
const logger = require('../utils/logger');

const imageCache = new Map();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
const DEFAULT_LOGO_PATH = path.join(__dirname, '../assets/default-logo.png');

async function fetchAndProcessImage(url, size = null, useDefault = true) {
    const cacheKey = size ? `${url}_${size}` : url;

    // Check cache
    const cached = imageCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        return cached.data;
    }

    try {
        let imageBuffer;
        let contentType = 'image/png';

        try {
            // Try to fetch the image from the server
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: {
                    'X-API-KEY': process.env.POCKET_ID_API_KEY
                }
            });
            imageBuffer = response.data;
            contentType = response.headers['content-type'];
        } catch (error) {
            // If fetch fails and useDefault is true, use default logo
            if (useDefault) {
                logger.warn(`Failed to fetch image from ${url}, using default logo`);
                imageBuffer = await Sharp(DEFAULT_LOGO_PATH).toBuffer();
            } else {
                throw error;
            }
        }

        // Process image if size is specified
        if (size) {
            imageBuffer = await Sharp(imageBuffer)
                .resize(size, size, {
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 0 }
                })
                .png()
                .toBuffer();
            contentType = 'image/png';
        }

        const result = { buffer: imageBuffer, contentType };

        // Cache the result
        imageCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
        });

        return result;
    } catch (error) {
        logger.error('Error processing image:', error);
        throw error;
    }
}

router.get('/logo', async (req, res) => {
    try {
        const isLight = req.query.light === 'true';
        const url = `${process.env.POCKET_ID_BASE_URL}/api/application-configuration/logo?light=${isLight}`;

        const image = await fetchAndProcessImage(url);

        res.set('Content-Type', image.contentType);
        res.set('Cache-Control', `public, max-age=${CACHE_DURATION / 1000}`);
        res.send(image.buffer);
    } catch (error) {
        logger.error('Error proxying logo:', error);
        res.status(404).sendFile(DEFAULT_LOGO_PATH);
    }
});

router.get('/app-icon/:size', async (req, res) => {
    try {
        const size = parseInt(req.params.size, 10);
        const validSizes = [120, 152, 167, 180, 192, 512];

        if (!validSizes.includes(size)) {
            return res.status(400).send('Invalid size requested');
        }

        const url = `${process.env.POCKET_ID_BASE_URL}/api/application-configuration/logo?light=false`;
        const image = await fetchAndProcessImage(url, size);

        res.set('Content-Type', image.contentType);
        res.set('Cache-Control', `public, max-age=${CACHE_DURATION / 1000}`);
        res.set('X-Content-Type-Options', 'nosniff');
        res.send(image.buffer);
    } catch (error) {
        logger.error('Error generating app icon:', error);
        // For app icons, always return a processed default logo
        try {
            const defaultImage = await Sharp(DEFAULT_LOGO_PATH)
                .resize(parseInt(req.params.size, 10), parseInt(req.params.size, 10), {
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 0 }
                })
                .png()
                .toBuffer();

            res.set('Content-Type', 'image/png');
            res.set('Cache-Control', `public, max-age=${CACHE_DURATION / 1000}`);
            res.send(defaultImage);
        } catch (defaultError) {
            logger.error('Error serving default logo:', defaultError);
            res.status(500).send('Failed to serve logo');
        }
    }
});

router.get('/favicon', async (req, res) => {
    try {
        const isLight = req.query.theme === 'light';
        const url = `${process.env.POCKET_ID_BASE_URL}/api/application-configuration/logo?light=${isLight}`;
        const image = await fetchAndProcessImage(url, 32);

        res.set('Content-Type', 'image/png');
        res.set('Cache-Control', `public, max-age=${CACHE_DURATION / 1000}`);
        res.send(image.buffer);
    } catch (error) {
        logger.error('Error generating favicon:', error);
        // For favicon, always return a processed default logo
        try {
            const defaultImage = await Sharp(DEFAULT_LOGO_PATH)
                .resize(32, 32, {
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 0 }
                })
                .png()
                .toBuffer();

            res.set('Content-Type', 'image/png');
            res.set('Vary', 'Sec-CH-Prefers-Color-Scheme');
            res.set('Cache-Control', `public, max-age=${CACHE_DURATION / 1000}`);
            res.send(defaultImage);
        } catch (defaultError) {
            logger.error('Error serving default favicon:', defaultError);
            res.status(500).send('Failed to serve favicon');
        }
    }
});

// Add this new function for iOS-specific image processing
async function processImageForIOS(imageBuffer, size) {
    // Create a square canvas with padding
    const padding = Math.floor(size * 0.1); // 10% padding
    const background = { r: 255, g: 255, b: 255, alpha: 1 }; // Solid white background

    return await Sharp(imageBuffer)
        .resize(size - (padding * 2), size - (padding * 2), {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        // Embed on white background with padding
        .extend({
            top: padding,
            bottom: padding,
            left: padding,
            right: padding,
            background: background
        })
        // Ensure PNG format
        .png()
        // Remove alpha channel to ensure solid background
        .removeAlpha()
        .toBuffer();
}

// Add new route specifically for iOS icons
router.get('/ios-icon/:size?', async (req, res) => {
    try {
        // Default size is 180x180 if no size specified
        const size = parseInt(req.params.size, 10) || 180;

        // Validate sizes according to Apple's specifications
        const validSizes = [152, 167, 180];
        if (req.params.size && !validSizes.includes(size)) {
            return res.status(400).send('Invalid size requested');
        }

        const url = `${process.env.POCKET_ID_BASE_URL}/api/application-configuration/logo?light=false`;

        try {
            // Try to fetch the remote image
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: {
                    'X-API-KEY': process.env.POCKET_ID_API_KEY
                }
            });

            const processedImage = await processImageForIOS(response.data, size);

            // Set specific headers for iOS icons
            res.set('Content-Type', 'image/png');
            res.set('Cache-Control', `public, max-age=${CACHE_DURATION / 1000}`);
            res.set('X-Content-Type-Options', 'nosniff');

            res.send(processedImage);
        } catch (error) {
            // If remote image fails, use default logo
            logger.warn('Failed to fetch remote logo, using default', error);
            const defaultImage = await processImageForIOS(
                await Sharp(DEFAULT_LOGO_PATH).toBuffer(),
                size
            );

            res.set('Content-Type', 'image/png');
            res.set('Cache-Control', `public, max-age=${CACHE_DURATION / 1000}`);
            res.set('X-Content-Type-Options', 'nosniff');

            res.send(defaultImage);
        }
    } catch (error) {
        logger.error('Error generating iOS icon:', error);
        res.status(500).send('Failed to generate icon');
    }
});

module.exports = router;