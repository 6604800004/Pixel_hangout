#include <stddef.h>
extern unsigned char __heap_base;
static size_t brk = 0;
void *malloc(size_t n){ if(!brk) brk=(size_t)&__heap_base; brk=(brk+15)&~(size_t)15; size_t p=brk; brk+=n;
  size_t need=(brk+65535)/65536, have=__builtin_wasm_memory_size(0); if(need>have && __builtin_wasm_memory_grow(0,need-have)==(size_t)-1) return 0; return (void*)p; }
void *memset(void*d,int c,size_t n){unsigned char*p=d;while(n--)*p++=(unsigned char)c;return d;}
void *calloc(size_t a,size_t b){void*p=malloc(a*b);if(p)memset(p,0,a*b);return p;}
void free(void*p){(void)p;}
void *memcpy(void*d,const void*s,size_t n){unsigned char*a=d;const unsigned char*b=s;while(n--)*a++=*b++;return d;}
void *memmove(void*d,const void*s,size_t n){unsigned char*a=d;const unsigned char*b=s;if(a<b){while(n--)*a++=*b++;}else{a+=n;b+=n;while(n--)*--a=*--b;}return d;}
void abort(void){__builtin_trap();}
/* ตัวช่วยฝั่ง JS: จองบัฟเฟอร์ 480 float */
void *px_buf(void){ return malloc(480*sizeof(float)); }
