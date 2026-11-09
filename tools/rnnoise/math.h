#pragma once
#define M_PI 3.14159265358979323846
static inline double sqrt(double x){return __builtin_sqrt(x);}
static inline float sqrtf(float x){return __builtin_sqrtf(x);}
static inline double floor(double x){return __builtin_floor(x);}
static inline float floorf(float x){return __builtin_floorf(x);}
static inline double fabs(double x){return __builtin_fabs(x);}
static inline float fabsf(float x){return __builtin_fabsf(x);}
__attribute__((import_module("env"),import_name("exp"))) double exp(double);
__attribute__((import_module("env"),import_name("log10"))) double log10(double);
__attribute__((import_module("env"),import_name("pow"))) double pow(double,double);
__attribute__((import_module("env"),import_name("sin"))) double sin(double);
__attribute__((import_module("env"),import_name("cos"))) double cos(double);
__attribute__((import_module("env"),import_name("log"))) double log(double);
