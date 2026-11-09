#pragma once
typedef struct FILE FILE;
#define stderr ((FILE*)0)
static inline int fprintf(FILE*f,const char*s,...){(void)f;(void)s;return 0;}
static inline int printf(const char*s,...){(void)s;return 0;}
