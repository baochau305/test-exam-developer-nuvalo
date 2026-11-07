FROM httpd:2.4

RUN sed -i \
        -e 's|^#\(LoadModule proxy_module \)|\1|' \
        -e 's|^#\(LoadModule proxy_fcgi_module \)|\1|' \
        -e 's|^#\(LoadModule rewrite_module \)|\1|' \
        conf/httpd.conf \
    && echo 'Include conf/extra/laravel.conf' >> conf/httpd.conf

COPY laravel.conf conf/extra/laravel.conf
