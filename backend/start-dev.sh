#!/bin/bash
cd backend
npm run dev 2>&1 | tee ../backend-debug.log