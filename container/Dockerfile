FROM fedora

RUN dnf update -y
RUN dnf install -y \
    nodejs npm python make gcc-c++ \
    systemd \
    which \
    procps-ng \
    sudo \
    git \
    curl wget \
    openssh-clients \
    findutils \
    grep sed gawk \
    nano vim-minimal \
    file \
    util-linux-user \
    rg \
    fish

RUN npm install -g --ignore-scripts @earendil-works/pi-coding-agent
RUN npm install -g --ignore-scripts tsx

ENTRYPOINT fish
