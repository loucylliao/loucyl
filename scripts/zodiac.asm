%macro display 3
    mov eax, 4
    mov ebx, %1
    mov ecx, %2
    mov edx, %3
    int 0x80
%endmacro

%macro read 3
    mov eax, 3
    mov ebx, %1
    mov ecx, %2
    mov edx, %3
    int 0x80
%endmacro

section .data

new_line db 0xa

;PROMPTS

    month_prompt db 'enter your birth month (1-12): '
    month_prompt_len equ $ - month_prompt
    
    date_prompt db 'enter your birthday (1-31): '
    date_prompt_len equ $ - date_prompt
    
;ZODIACS

    ;aries
    aries_symbol db 0x7f, 0xa, 0x7f, '  :1}[}!.        .:}[}{"', 0xa, '  "_    `t_      >j^    }^', 0xa, '  ""      +n.   r?      ""', 0xa, '   `       {\  (1       `', 0xa, '            &^^8.', 0xa, '            >\\>', 0xa, '            .%B.', 0xa, '             jj', 0xa, 0xa
    aries_symbol_len equ $ - aries_symbol
    aries_desc db 'aries (march 21 - april 19)', 0xa, 'element: fire', 0xa, 'aries individuals are often energetic', 0xa, 'and pioneering, unafraid to take risks', 0xa, 'and explore new territories.', 0xa
    aries_desc_len equ $ - aries_desc

    ;taurus
    taurus_symbol db 0x7f, 0xa, 0x7f, '    .<>           .):', 0xa, '      ?|         "W,', 0xa, '       ?c,.    "<c`', 0xa, '        .:](|((~`', 0xa, '         ".    .`', 0xa, '       .l        i"', 0xa, '       `n.       /`', 0xa, '       `):      ;(`', 0xa, '          .";I,"', 0xa, 0xa
    taurus_symbol_len equ $ - taurus_symbol
    taurus_desc db 'taurus (april 20 - may 20)', 0xa, 'element: earth', 0xa, 'aries individuals are often energetic', 0xa, 'and pioneering, unafraid to take risks', 0xa, 'and explore new territories.', 0xa
    taurus_desc_len equ $ - taurus_desc

    ;gemini 
    gemini_symbol db 0x7f, 0xa, 0x7f, '.``"..            ..`"', 0xa, '  ""i}fxuuvunxrrf{i^.', 0xa, '      :        `"', 0xa, '      r"       c.', 0xa, '      |_      `@', 0xa, '      )]      ^B', 0xa, '      f"      .%', 0xa, '      <        ,"', 0xa, '   ",![1\fjjf/|{[!""', 0xa, ' `^,"```....   ..""`^^` ', 0xa, 0xa
    gemini_symbol_len equ $ - gemini_symbol
    gemini_desc db 'gemini (may 21 - june 20)', 0xa, 'element: air', 0xa, 'aries individuals are often energetic', 0xa, 'and pioneering, unafraid to take risks', 0xa, 'and explore new territories.', 0xa
    gemini_desc_len equ $ - gemini_desc
    
    ;cancer 
    cancer_symbol db 0x7f, 0xa, 0x7f, '             ."`^""""^`".', 0xa, '       ."+/*Wut1?+i!lIl!>+<l:"`', 0xa, '      ^t%1;^`.                  `..', 0xa, '   {$?.    .,"', 0xa,'   >$`        n^        ;x#jtx8ui.', 0xa, '   .Wn`     .[c        j/`     `nW.', 0xa, '    .iu#f|\vui        `#        `$-', 0xa, '        .`.           .j        !$I', 0xa, '    .`                  .`^:1%j"', 0xa, '       `,;i+~!I;;;;l>_}\nW8x],.', 0xa, '           .`^",,,,"^`.', 0xa, 0xa
    cancer_symbol_len equ $ - cancer_symbol
    cancer_desc db 'cancer (june 21 - july 22)', 0xa, 'element: water', 0xa, 'aries individuals are often energetic', 0xa, 'and pioneering, unafraid to take risks', 0xa, 'and explore new territories.', 0xa
    cancer_desc_len equ $ - cancer_desc

    ;leo 
    leo_symbol db 0x7f, 0xa, 0x7f, '       ,)()1111;.', 0xa, '      ?t.      ,&`', 0xa, '      v:        1j', 0xa, '    .. r{      "8.', 0xa, ' "`.  ..xi    "M`', 0xa, ',`      `@.  `#^', 0xa, 'I^      `@. .*^', 0xa, '.(:.  .;*,  ?,', 0xa, '  `I_?~".   /', 0xa, '            -', 0xa, '             ^""...', 0xa, 0xa
    leo_symbol_len equ $ - leo_symbol
    leo_desc db 'leo (july 23 - august 22)', 0xa, 'element: fire', 0xa, 'leos are natural leaders, passionate and bold', 0xa, 'they are known for their confidence and creativity', 0xa, 'and they enjoy being the center of attention.', 0xa
    leo_desc_len equ $ - leo_desc

    ;virgo 
    virgo_symbol db 0x7f, 0xa, 0x7f, '"   ^f*"  `[r"', 0xa, '`_ ^; ju `, |u', 0xa, '"@`"  "$`.  "$` I\^', 0xa, '.$;   .$:   .$;"`l%.', 0xa, ' 8{    &~    #_. .@,', 0xa,' /|    r_    v?  .B"', 0xa, ' 1+    |,    M+  [*', 0xa, ' }`    _.    BI [&`', 0xa, ' "     ~     W[v}.', 0xa, '           .;jr.', 0xa, '         .""  :`', 0xa, 0xa
    virgo_symbol_len equ $ - virgo_symbol
    virgo_desc db 'virgo (august 23 - september 22)', 0xa, 'element: earth', 0xa, 'virgos are analytical, meticulous and practical', 0xa, 'they have a strong desire to help others and improve situations', 0xa, 'and are known for their attention to detail.', 0xa
    virgo_desc_len equ $ - virgo_desc

    ;libra 
    libra_symbol db 0x7f, 0xa, 0x7f, '          .`,:,^"', 0xa, '        "f%/_i>]x&|^', 0xa, '       1@i       .;8r.', 0xa, '      :$I          `$t', 0xa, '      {$`          .$z', 0xa, '      `@1          {$"', 0xa, '       ^Wu`      "jW^', 0xa, ' ."`^,;>?\\"    `t\?!:,^`"..', 0xa, 0xa, '  ."``^"",,,,,,,,,,,""^``.', 0xa, '."`^,:;!><~~+~~~<<<<>!;,"`".', 0xa, 0xa
    libra_symbol_len equ $ - libra_symbol
    libra_desc db 'libra (september 23 - october 22)', 0xa, 'element: air', 0xa, 'libras are diplomatic, charming, and balanced', 0xa, 'they seek harmony and fairness in all things', 0xa, 'and often serve as peacemakers in difficult situations.', 0xa
    libra_desc_len equ $ - libra_desc

    ;scorpio 
    scorpio_symbol db 0x7f, 0xa, 0x7f, '`   >cf   I/?', 0xa, 'I" >`.@l I.`$,', 0xa, ',v.   1x.   t/', 0xa, '`$.   "@    ;&', 0xa, '.$^   "$.   `$', 0xa, ' @,   .$"   `$.', 0xa, ' z`    #    ^$', 0xa, ' "     .    `&   "`', 0xa, '             ;?`  "-[.', 0xa, '               .`."],', 0xa, 0xa
    scorpio_symbol_len equ $ - scorpio_symbol
    scorpio_desc db 'scorpio (october 23 - november 21)', 0xa, 'element: water', 0xa, 'scorpios are known for their intensity and passion', 0xa, 'they are courageous, determined, and resourceful', 0xa, 'and they possess great emotional depth.', 0xa
    scorpio_desc_len equ $ - scorpio_desc

    ;sagittarius 
    sagittarius_symbol db 0x7f, 0xa, 0x7f, '           .""```^^`"', 0xa, '           ."^,I>+-x@|', 0xa, '                .;>.#c', 0xa, '              .?x`  tc', 0xa, '  .;"     "|&l      .{', 0xa, '   .fr" `|&l         "', 0xa, '     ^#M@l', 0xa, '    .1M<nu^', 0xa, '   ~x,   `(}', 0xa, ' ^<`', 0xa, 0xa
    sagittarius_symbol_len equ $ - sagittarius_symbol
    sagittarius_desc db 'sagittarius (november 22 - december 21)', 0xa, 'element: fire', 0xa, 'sagittarians are adventurous, optimistic, and philosophical', 0xa, 'they value freedom and are always seeking knowledge', 0xa, 'and are known for their straightforwardness.', 0xa
    sagittarius_desc_len equ $ - sagittarius_desc

    ;capricorn 
    capricorn_symbol db 0x7f, 0xa, 0x7f, '`,^     .>>_.', 0xa, '  IW`  .[. ln', 0xa, '   i%. ~   .$,', 0xa, '    %l`.    r|', 0xa, '    |}`     ~M', 0xa, '    I[      "$. `?f/t|:', 0xa, '    ."      .$^]u^   .?z.', 0xa, '             t@_       $,', 0xa, '            "l .>ff((r{.', 0xa, '           ":', 0xa, 0xa
    capricorn_symbol_len equ $ - capricorn_symbol
    capricorn_desc db 'capricorn (december 22 - january 19)', 0xa, 'element: earth', 0xa, 'capricorns are disciplined, responsible, and ambitious', 0xa, 'they are known for their practicality and strong work ethic', 0xa, 'and they value stability and security.', 0xa
    capricorn_desc_len equ $ - capricorn_desc

    ;aquarius 
    aquarius_symbol db 0x7f, 0xa, 0x7f, '      .;j]      :v@"    .~#x,', 0xa, '    `[}":$+  .-%v;@8  .[@|. (', 0xa, '  ^:`    j$;|$/`  ]$<]@n`   .^', 0xa, ' .       .vz<.    .#$r"      .', 0xa, 0xa, '       .:`      .!{.     "-u`', 0xa, '     "|)|@^   `)@r$n   `f8;"(', 0xa, '  .:<^  .W&."n@}" r$``x$].  "`', 0xa, '.""      ^@@*!.   `$%$1"     "', 0xa, 0xa
    aquarius_symbol_len equ $ - aquarius_symbol
    aquarius_desc db 'aquarius (january 20 - february 18)', 0xa, 'element: air', 0xa, 'aquarians are independent, innovative, and intellectual', 0xa, 'they value individuality and are often ahead of their time', 0xa, 'and they are known for their humanitarianism.', 0xa
    aquarius_desc_len equ $ - aquarius_desc

    ;piscies 
    pisces_symbol db 0x7f, 0xa, 0x7f, ' .              .', 0xa, ' .<^          `~`', 0xa, '   {(.       +r.', 0xa, '    `$;    `$;', 0xa, '.`";i$c<<~~j$-:"`.', 0xa, '  ."`@f````[$"..', 0xa, '    `$:    `$:', 0xa, '   +z.      .f\', 0xa, '  +!          ,}.', 0xa, ' "              ".', 0xa, 0xa
    pisces_symbol_len equ $ - pisces_symbol
    pisces_desc db 'pisces (february 19 - march 20)', 0xa, 'element: water', 0xa, 'pisceans are compassionate, artistic, and intuitive', 0xa, 'they are known for their empathy and creativity', 0xa, 'and they often have a deep spiritual connection.', 0xa
    pisces_desc_len equ $ - pisces_desc


section .bss
    month resb 3
    date resb 3
    
section .text
    global _start:

_start:

call display_month_prompt
call read_month
call display_date_prompt
call read_date
call print_new_line
call analyze_zodiac
call exit

print_new_line:
    display 1, new_line, 1
    ret

display_month_prompt:
    display 1, month_prompt, month_prompt_len
    ret

display_date_prompt:
    display 1, date_prompt, date_prompt_len
    ret

read_month:
    read 0, month, 3
    ret

read_date:
    read 0, date, 3
    ret
    
analyze_zodiac:
    movzx eax, byte[month]
    sub eax, '0'
    movzx ebx, byte[month + 1]
    cmp ebx, 0xa
    je single_digit_month

    sub ebx, '0'
    imul eax, 10
    add eax, ebx
    
single_digit_month:
    movzx ebx, byte[date]
    sub ebx, '0'

    movzx ecx, byte[date + 1]
    cmp ecx, 0xa
    je single_digit_date

    sub ecx, '0'
    imul ebx, 10
    add ebx, ecx
    
single_digit_date:
    jmp determine_zodiac

determine_zodiac:
    cmp eax, 1
    je january
    cmp eax, 2
    je february
    cmp eax, 3
    je march
    cmp eax, 4
    je april
    cmp eax, 5
    je may
    cmp eax, 6
    je june
    cmp eax, 7
    je july
    cmp eax, 8
    je august
    cmp eax, 9
    je september
    cmp eax, 10
    je october
    cmp eax, 11
    je november
    cmp eax, 12
    je december
    jmp exit

january:
    cmp ebx, 19
    jle zodiac_capricorn
    jmp zodiac_aquarius

february:
    cmp ebx, 18
    jle zodiac_aquarius
    jmp zodiac_pisces

march:
    cmp ebx, 20
    jle zodiac_pisces
    jmp zodiac_aries

april:
    cmp ebx, 19
    jle zodiac_aries
    jmp zodiac_taurus

may:
    cmp ebx, 20
    jle zodiac_taurus
    jmp zodiac_gemini

june:
    cmp ebx, 20
    jle zodiac_gemini
    jmp zodiac_cancer

july:
    cmp ebx, 22
    jle zodiac_cancer
    jmp zodiac_leo

august:
    cmp ebx, 22
    jle zodiac_leo
    jmp zodiac_virgo

september:
    cmp ebx, 22
    jle zodiac_virgo
    jmp zodiac_libra

october:
    cmp ebx, 22
    jle zodiac_libra
    jmp zodiac_scorpio

november:
    cmp ebx, 21
    jle zodiac_scorpio
    jmp zodiac_sagittarius

december:
    cmp ebx, 21
    jle zodiac_sagittarius
    jmp zodiac_capricorn
    
;ZODIACS

zodiac_aries:
    display 1, aries_symbol, aries_symbol_len
    display 1, aries_desc, aries_desc_len
    ret

zodiac_taurus:
    display 1, taurus_symbol, taurus_symbol_len
    display 1, taurus_desc, taurus_desc_len
    ret

zodiac_gemini:
    display 1, gemini_symbol, gemini_symbol_len
    display 1, gemini_desc, gemini_desc_len
    ret

zodiac_cancer:
    display 1, cancer_symbol, cancer_symbol_len
    display 1, cancer_desc, cancer_desc_len
    ret

zodiac_leo:
    display 1, leo_symbol, leo_symbol_len
    display 1, leo_desc, leo_desc_len
    ret

zodiac_virgo:
    display 1, virgo_symbol, virgo_symbol_len
    display 1, virgo_desc, virgo_desc_len
    ret

zodiac_libra:
    display 1, libra_symbol, libra_symbol_len
    display 1, libra_desc, libra_desc_len
    ret

zodiac_scorpio:
    display 1, scorpio_symbol, scorpio_symbol_len
    display 1, scorpio_desc, scorpio_desc_len
    ret

zodiac_sagittarius:
    display 1, sagittarius_symbol, sagittarius_symbol_len
    display 1, sagittarius_desc, sagittarius_desc_len
    ret

zodiac_capricorn:
    display 1, capricorn_symbol, capricorn_symbol_len
    display 1, capricorn_desc, capricorn_desc_len
    ret

zodiac_aquarius:
    display 1, aquarius_symbol, aquarius_symbol_len
    display 1, aquarius_desc, aquarius_desc_len
    ret

zodiac_pisces:
    display 1, pisces_symbol, pisces_symbol_len
    display 1, pisces_desc, pisces_desc_len
    ret

exit:
    mov eax, 1
	xor ebx, ebx
	int 0x80