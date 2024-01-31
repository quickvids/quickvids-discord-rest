export type TextExtra = {
    end: number;
    hashtag_id: string;
    hashtag_name: string;
    is_commerce: boolean;
    sec_uid: string;
    start: number;
    type: number;
    user_id: string;
};


export type SmartDescription = {
    cleaned: string; // NOTE: A desc containing only the text, no hashtags.
    raw: string;
    hashtags: string[];
};
